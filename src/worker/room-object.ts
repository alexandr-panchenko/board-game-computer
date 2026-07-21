import { DurableObject } from "cloudflare:workers";

import { parseCell } from "../runtime/parser/parse-cell";
import { stableHash } from "../runtime/store/hash";
import { validateCell } from "../runtime/validator/validate-cell";
import {
  CellProposalSchema,
  ClientRoomMessageSchema,
  type CellProposal,
  type CommittedCell,
  type RoomRole,
  type RoomSnapshot,
} from "../shared/room";
import {
  APP_FRAMEWORK_VERSION,
  APP_LANGUAGE_VERSION,
} from "../shared/versions";
import type { Env } from "./env";

interface RoomRow {
  [key: string]: string | number | null;
  room_id: string;
  template_id: string;
  head_seq: number;
  head_state_hash: string;
  language_version: string;
  framework_version: string;
  created_at: string;
  parent_room_id: string | null;
  parent_seq: number | null;
}

interface CellRow {
  [key: string]: string | number | null;
  seq: number;
  command_id: string;
  kind: CommittedCell["kind"];
  source: string | null;
  chat_text: string | null;
  source_hash: string | null;
  author_json: string;
  metadata_json: string | null;
  base_state_hash: string;
  post_state_hash: string | null;
  committed_at: string;
}

interface SocketAttachment {
  joined: boolean;
  clientId?: string;
  role?: RoomRole;
  seatId?: string;
  lastSeq: number;
}

interface InitializeRequest {
  roomId: string;
  templateId: string;
  initialStateHash: string;
  designerCapabilityHash: string;
  playerCapabilityHash: string;
  parentRoomId?: string;
  parentSeq?: number;
  cells?: CommittedCell[];
}

interface RoomLimits {
  maxCellBytes: number;
  maxCells: number;
  maxConnections: number;
  commandsPerMinute: number;
  maxChatBytes: number;
}

const json = (value: unknown, status = 200): Response =>
  Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

export async function hashCapability(capability: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(capability),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export class RoomObject extends DurableObject<Env> {
  private readonly limits: RoomLimits;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.limits = {
      maxCellBytes: positiveInt(env.ROOM_MAX_CELL_BYTES, 32_768),
      maxCells: positiveInt(env.ROOM_MAX_CELLS, 2_000),
      maxConnections: positiveInt(env.ROOM_MAX_CONNECTIONS, 16),
      commandsPerMinute: positiveInt(env.ROOM_COMMANDS_PER_MINUTE, 120),
      maxChatBytes: positiveInt(env.ROOM_MAX_CHAT_MESSAGE_BYTES, 8_192),
    };
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS room_health (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        initialized_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS rooms (
        room_id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        head_seq INTEGER NOT NULL,
        head_state_hash TEXT NOT NULL,
        language_version TEXT NOT NULL,
        framework_version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        parent_room_id TEXT,
        parent_seq INTEGER
      );
      CREATE TABLE IF NOT EXISTS cells (
        seq INTEGER PRIMARY KEY,
        command_id TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL,
        source TEXT,
        chat_text TEXT,
        source_hash TEXT,
        author_json TEXT NOT NULL,
        metadata_json TEXT,
        base_state_hash TEXT NOT NULL,
        post_state_hash TEXT,
        committed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS player_capabilities (
        cap_hash TEXT PRIMARY KEY,
        seat_id TEXT,
        role TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS command_rate (
        client_id TEXT NOT NULL,
        minute TEXT NOT NULL,
        commands INTEGER NOT NULL,
        PRIMARY KEY (client_id, minute)
      );
    `);
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO room_health (id, initialized_at) VALUES (1, datetime('now'))",
    );
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") return this.health();
    if (url.pathname === "/internal/initialize" && request.method === "POST")
      return this.initialize(await request.json<InitializeRequest>());
    if (url.pathname === "/snapshot" && request.method === "GET") {
      const authenticated = await this.authenticateRequest(request);
      if (authenticated === null) return json({ error: "unauthorized" }, 401);
      return json(
        this.snapshot(Number(url.searchParams.get("afterSeq") ?? "0")),
      );
    }
    if (url.pathname === "/propose" && request.method === "POST") {
      const authenticated = await this.authenticateRequest(request);
      if (authenticated === null) return json({ error: "unauthorized" }, 401);
      return this.proposeResponse(await request.json(), authenticated.role);
    }
    if (url.pathname === "/socket") return this.openSocket(request);
    return json({ error: "not_found" }, 404);
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    const messageBytes =
      typeof message === "string"
        ? new TextEncoder().encode(message).byteLength
        : message.byteLength;
    if (messageBytes > 96_000) {
      this.send(socket, { type: "room.error", code: "message_too_large" });
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(
        typeof message === "string"
          ? message
          : new TextDecoder().decode(message),
      );
    } catch {
      this.send(socket, { type: "room.error", code: "invalid_json" });
      return;
    }
    const parsed = ClientRoomMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.send(socket, { type: "room.error", code: "invalid_message" });
      return;
    }
    const attachment = socket.deserializeAttachment() as SocketAttachment;
    if (parsed.data.type === "room.join") {
      const authenticated = await this.authenticate(parsed.data.capability);
      if (authenticated === null) {
        this.send(socket, { type: "room.error", code: "unauthorized" });
        socket.close(1008, "Unauthorized");
        return;
      }
      const joined: SocketAttachment = {
        joined: true,
        clientId: parsed.data.clientId,
        role: authenticated.role,
        ...(authenticated.seatId === undefined
          ? {}
          : { seatId: authenticated.seatId }),
        lastSeq: parsed.data.lastSeq,
      };
      socket.serializeAttachment(joined);
      this.send(socket, {
        type: "room.snapshot",
        snapshot: this.snapshot(parsed.data.lastSeq),
        role: authenticated.role,
      });
      return;
    }
    if (!attachment.joined || attachment.role === undefined) {
      this.send(socket, { type: "room.error", code: "join_required" });
      return;
    }
    if (parsed.data.type === "room.tail.request") {
      this.send(socket, {
        type: "room.cells",
        cells: this.cellsAfter(parsed.data.afterSeq),
      });
      return;
    }
    if (parsed.data.type === "state.hash.report") {
      const room = this.room();
      if (
        parsed.data.seq === room.head_seq &&
        parsed.data.stateHash !== room.head_state_hash
      ) {
        this.send(socket, {
          type: "state.hash_mismatch",
          seq: room.head_seq,
          expectedHash: room.head_state_hash,
        });
      }
      return;
    }
    const response = this.propose(parsed.data.proposal, attachment.role);
    if (response.type === "cell.committed") this.broadcast(response);
    else this.send(socket, response);
  }

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    socket.close(code, reason);
  }

  webSocketError(socket: WebSocket): void {
    socket.close(1011, "WebSocket error");
  }

  private health(): Response {
    const row = this.ctx.storage.sql
      .exec<{ initialized_at: string }>(
        "SELECT initialized_at FROM room_health WHERE id = 1",
      )
      .one();
    return json({
      ok: true,
      durableObject: "RoomObject",
      storage: "sqlite",
      initialized: typeof row.initialized_at === "string",
    });
  }

  private initialize(input: InitializeRequest): Response {
    const current = this.ctx.storage.sql
      .exec<{ count: number }>("SELECT COUNT(*) AS count FROM rooms")
      .one();
    if (current.count > 0) return json(this.snapshot(0));
    const createdAt = new Date().toISOString();
    const cells = input.cells ?? [];
    const head = cells.at(-1);
    const headSeq = head?.seq ?? 0;
    const headHash = head?.canonicalPostStateHash ?? input.initialStateHash;
    this.ctx.storage.transactionSync(() => {
      this.ctx.storage.sql.exec(
        `INSERT INTO rooms
          (room_id, template_id, head_seq, head_state_hash, language_version,
           framework_version, created_at, parent_room_id, parent_seq)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.roomId,
        input.templateId,
        headSeq,
        headHash,
        APP_LANGUAGE_VERSION,
        APP_FRAMEWORK_VERSION,
        createdAt,
        input.parentRoomId ?? null,
        input.parentSeq ?? null,
      );
      this.ctx.storage.sql.exec(
        "INSERT INTO player_capabilities (cap_hash, seat_id, role) VALUES (?, NULL, 'designer'), (?, 'human', 'player')",
        input.designerCapabilityHash,
        input.playerCapabilityHash,
      );
      for (const cell of cells) this.insertCell(cell);
    });
    return json(this.snapshot(0), 201);
  }

  private async authenticateRequest(
    request: Request,
  ): Promise<{ role: RoomRole; seatId?: string } | null> {
    const capability = request.headers.get("x-room-capability");
    return capability === null ? null : this.authenticate(capability);
  }

  private async authenticate(
    capability: string,
  ): Promise<{ role: RoomRole; seatId?: string } | null> {
    const hash = await hashCapability(capability);
    const rows = this.ctx.storage.sql
      .exec<{ role: RoomRole; seat_id: string | null }>(
        "SELECT role, seat_id FROM player_capabilities WHERE cap_hash = ? AND revoked_at IS NULL",
        hash,
      )
      .toArray();
    const row = rows[0];
    if (row === undefined) return null;
    return {
      role: row.role,
      ...(row.seat_id === null ? {} : { seatId: row.seat_id }),
    };
  }

  private openSocket(request: Request): Response {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return json({ error: "upgrade_required" }, 426);
    if (this.ctx.getWebSockets().length >= this.limits.maxConnections)
      return json({ error: "connection_limit" }, 429);
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      joined: false,
      lastSeq: 0,
    } satisfies SocketAttachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  private proposeResponse(raw: unknown, role: RoomRole): Response {
    const result = this.propose(raw, role);
    if (result.type === "cell.committed") this.broadcast(result);
    return json(result, result.type === "cell.rejected" ? 400 : 200);
  }

  private propose(raw: unknown, role: RoomRole): Record<string, unknown> {
    const parsed = CellProposalSchema.safeParse(raw);
    if (!parsed.success)
      return { type: "cell.rejected", code: "invalid_proposal" };
    const proposal = parsed.data;
    const room = this.room();
    if (proposal.roomId !== room.room_id)
      return { type: "cell.rejected", code: "room_mismatch" };
    if (proposal.author.role !== role)
      return { type: "cell.rejected", code: "role_mismatch" };
    if (role === "player" && proposal.author.seatId !== "human")
      return { type: "cell.rejected", code: "seat_mismatch" };
    if (
      proposal.kind === "system" ||
      (proposal.kind === "code" && role !== "designer")
    )
      return { type: "cell.rejected", code: "capability_denied" };
    const existing = this.cellByCommandId(proposal.commandId);
    if (existing !== undefined)
      return { type: "cell.committed", cell: existing, idempotent: true };
    if (
      new TextEncoder().encode(JSON.stringify(proposal)).byteLength >
      this.limits.maxCellBytes
    )
      return { type: "cell.rejected", code: "cell_too_large" };
    if (
      proposal.chatText !== undefined &&
      new TextEncoder().encode(proposal.chatText).byteLength >
        this.limits.maxChatBytes
    )
      return { type: "cell.rejected", code: "chat_too_large" };
    if (room.head_seq >= this.limits.maxCells)
      return { type: "cell.rejected", code: "room_cell_limit" };
    if (!this.reserveCommand(proposal.author.clientId))
      return { type: "cell.rejected", code: "command_rate_limit" };
    if (
      proposal.baseSeq !== room.head_seq ||
      proposal.baseStateHash !== room.head_state_hash
    ) {
      return {
        type: "cell.rebase_required",
        headSeq: room.head_seq,
        headStateHash: room.head_state_hash,
        cells: this.cellsAfter(proposal.baseSeq),
      };
    }
    const validation = this.validateProposalSource(proposal, role);
    if (validation !== null)
      return {
        type: "cell.rejected",
        code: "source_rejected",
        diagnostic: validation,
      };
    const cell = this.commit(proposal);
    return { type: "cell.committed", cell };
  }

  private validateProposalSource(
    proposal: CellProposal,
    role: RoomRole,
  ): { code: string; message: string } | null {
    if (proposal.kind === "chat") return null;
    try {
      const parsed = parseCell(proposal.source ?? "");
      validateCell(
        parsed.program,
        proposal.kind === "action" ? "player" : role,
      );
      return null;
    } catch (error) {
      const candidate = error as {
        diagnostic?: { code?: unknown; message?: unknown };
      };
      return {
        code:
          typeof candidate.diagnostic?.code === "string"
            ? candidate.diagnostic.code
            : "TS_SOURCE_REJECTED",
        message:
          typeof candidate.diagnostic?.message === "string"
            ? candidate.diagnostic.message
            : "Source failed validation",
      };
    }
  }

  private commit(proposal: CellProposal): CommittedCell {
    const room = this.room();
    const cell: CommittedCell = {
      ...proposal,
      seq: room.head_seq + 1,
      committedAt: new Date().toISOString(),
      ...(proposal.source === undefined
        ? {}
        : { sourceHash: stableHash(proposal.source) }),
      ...(proposal.proposedPostStateHash === undefined
        ? {}
        : { canonicalPostStateHash: proposal.proposedPostStateHash }),
    };
    this.ctx.storage.transactionSync(() => {
      this.insertCell(cell);
      this.ctx.storage.sql.exec(
        "UPDATE rooms SET head_seq = ?, head_state_hash = ? WHERE room_id = ?",
        cell.seq,
        cell.canonicalPostStateHash ?? room.head_state_hash,
        room.room_id,
      );
    });
    return cell;
  }

  private reserveCommand(clientId: string): boolean {
    const minute = new Date().toISOString().slice(0, 16);
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO command_rate VALUES (?, ?, 0)",
      clientId,
      minute,
    );
    const row = this.ctx.storage.sql
      .exec<{ commands: number }>(
        "SELECT commands FROM command_rate WHERE client_id = ? AND minute = ?",
        clientId,
        minute,
      )
      .one();
    if (row.commands >= this.limits.commandsPerMinute) return false;
    this.ctx.storage.sql.exec(
      "UPDATE command_rate SET commands = commands + 1 WHERE client_id = ? AND minute = ?",
      clientId,
      minute,
    );
    return true;
  }

  private insertCell(cell: CommittedCell): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO cells
        (seq, command_id, kind, source, chat_text, source_hash, author_json,
         metadata_json, base_state_hash, post_state_hash, committed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      cell.seq,
      cell.commandId,
      cell.kind,
      cell.source ?? null,
      cell.chatText ?? null,
      cell.sourceHash ?? null,
      JSON.stringify(cell.author),
      cell.metadata === undefined ? null : JSON.stringify(cell.metadata),
      cell.baseStateHash,
      cell.canonicalPostStateHash ?? null,
      cell.committedAt,
    );
  }

  private room(): RoomRow {
    const rows = this.ctx.storage.sql
      .exec<RoomRow>("SELECT * FROM rooms")
      .toArray();
    const room = rows[0];
    if (room === undefined) throw new Error("Room is not initialized");
    return room;
  }

  private snapshot(afterSeq: number): RoomSnapshot {
    const room = this.room();
    return {
      roomId: room.room_id,
      templateId: room.template_id,
      headSeq: room.head_seq,
      headStateHash: room.head_state_hash,
      languageVersion: APP_LANGUAGE_VERSION,
      frameworkVersion: APP_FRAMEWORK_VERSION,
      ...(room.parent_room_id === null
        ? {}
        : { parentRoomId: room.parent_room_id }),
      ...(room.parent_seq === null ? {} : { parentSeq: room.parent_seq }),
      cells: this.cellsAfter(afterSeq),
    };
  }

  private cellsAfter(seq: number): CommittedCell[] {
    return this.ctx.storage.sql
      .exec<CellRow>("SELECT * FROM cells WHERE seq > ? ORDER BY seq ASC", seq)
      .toArray()
      .map((row) => rowToCell(row, this.room().room_id));
  }

  private cellByCommandId(commandId: string): CommittedCell | undefined {
    return this.ctx.storage.sql
      .exec<CellRow>("SELECT * FROM cells WHERE command_id = ?", commandId)
      .toArray()
      .map((row) => rowToCell(row, this.room().room_id))[0];
  }

  private send(socket: WebSocket, message: unknown): void {
    socket.send(JSON.stringify(message));
  }

  private broadcast(message: unknown): void {
    for (const socket of this.ctx.getWebSockets()) {
      const attachment = socket.deserializeAttachment() as SocketAttachment;
      if (attachment.joined) this.send(socket, message);
    }
  }
}

function rowToCell(row: CellRow, roomId: string): CommittedCell {
  return {
    commandId: row.command_id,
    roomId,
    baseSeq: row.seq - 1,
    baseStateHash: row.base_state_hash,
    kind: row.kind,
    ...(row.source === null ? {} : { source: row.source }),
    ...(row.chat_text === null ? {} : { chatText: row.chat_text }),
    author: JSON.parse(row.author_json) as CommittedCell["author"],
    clientLanguageVersion: APP_LANGUAGE_VERSION,
    clientFrameworkVersion: APP_FRAMEWORK_VERSION,
    ...(row.post_state_hash === null
      ? {}
      : { proposedPostStateHash: row.post_state_hash }),
    ...(row.metadata_json === null
      ? {}
      : { metadata: JSON.parse(row.metadata_json) as Record<string, unknown> }),
    seq: row.seq,
    committedAt: row.committed_at,
    ...(row.source_hash === null ? {} : { sourceHash: row.source_hash }),
    ...(row.post_state_hash === null
      ? {}
      : { canonicalPostStateHash: row.post_state_hash }),
  };
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
