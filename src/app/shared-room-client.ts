import type { RuntimePatch } from "../runtime";
import {
  applySharedCell,
  createCuratedCheckpoint,
  resolveCanonicalAction,
  validateDesignerCandidate,
  type ShiftingVaultsGame,
} from "../sample";
import type {
  CellProposal,
  CommittedCell,
  RoomCreation,
  RoomRole,
  RoomSnapshot,
} from "../shared/room";
import {
  APP_FRAMEWORK_VERSION,
  APP_LANGUAGE_VERSION,
} from "../shared/versions";
import type { LegalActionOption } from "../runtime";

interface PatchPair {
  forward: RuntimePatch;
  inverse: RuntimePatch;
}

interface PendingCell extends PatchPair {
  commandId: string;
  kind: "action" | "code";
  source: string;
  postHash: string;
}

interface TimelineCell {
  cell: CommittedCell;
  patch: PatchPair | null;
}

export interface SharedRoomView {
  roomId: string;
  role: RoomRole;
  connection: "connecting" | "connected" | "reconnecting" | "conflict";
  confirmedSeq: number;
  pendingCount: number;
  timelineCursor: number;
  timelineLength: number;
  live: boolean;
  playerUrl?: string;
  forkUrl?: string;
}

export interface RoomAccess {
  roomId: string;
  role: RoomRole;
  capability: string;
}

type Update = (
  game: ShiftingVaultsGame,
  view: SharedRoomView,
  message: string,
) => void;

export async function createSharedRoom(
  initialStateHash: string,
): Promise<RoomCreation> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      templateId: "shifting-vaults-judge-v1",
      initialStateHash,
    }),
  });
  if (!response.ok) throw new Error("Could not create the persistent room");
  const creation: RoomCreation = await response.json();
  return creation;
}

export function accessFromLocation(): RoomAccess | null {
  const match = /^\/room\/([A-Za-z0-9._:-]+)$/.exec(location.pathname);
  if (match === null) return null;
  const roomId = match[1]!;
  const fragment = new URLSearchParams(location.hash.slice(1));
  const designer = fragment.get("designer");
  const player = fragment.get("player");
  const role: RoomRole | null =
    designer !== null ? "designer" : player !== null ? "player" : null;
  const capability = designer ?? player;
  if (role !== null && capability !== null) {
    sessionStorage.setItem(
      capabilityKey(roomId),
      JSON.stringify({ role, capability }),
    );
    history.replaceState(null, "", `/room/${roomId}`);
    return { roomId, role, capability };
  }
  const stored = sessionStorage.getItem(capabilityKey(roomId));
  if (stored === null) return null;
  try {
    const parsed = JSON.parse(stored) as {
      role?: unknown;
      capability?: unknown;
    };
    if (
      (parsed.role === "designer" || parsed.role === "player") &&
      typeof parsed.capability === "string"
    )
      return { roomId, role: parsed.role, capability: parsed.capability };
  } catch {
    return null;
  }
  return null;
}

export function accessFromCreation(creation: RoomCreation): RoomAccess {
  const url = new URL(creation.designerUrl);
  const capability = new URLSearchParams(url.hash.slice(1)).get("designer");
  if (capability === null) throw new Error("Designer capability is missing");
  sessionStorage.setItem(
    capabilityKey(creation.roomId),
    JSON.stringify({ role: "designer", capability }),
  );
  history.replaceState(null, "", `/room/${creation.roomId}`);
  return { roomId: creation.roomId, role: "designer", capability };
}

export class SharedRoomClient {
  private game = createCuratedCheckpoint();
  private socket: WebSocket | null = null;
  private destroyed = false;
  private reconnectTimer: number | null = null;
  private confirmedSeq = 0;
  private confirmedHash = this.game.snapshot().stateHash;
  private pending: PendingCell[] = [];
  private inFlightCommandId: string | null = null;
  private timeline: TimelineCell[] = [];
  private timelineCursor = 0;
  private connection: SharedRoomView["connection"] = "connecting";
  private playerUrl: string | undefined;
  private forkUrl: string | undefined;

  constructor(
    private readonly access: RoomAccess,
    private readonly update: Update,
    options: { playerUrl?: string } = {},
  ) {
    this.playerUrl = options.playerUrl;
    this.connect();
  }

  currentGame(): ShiftingVaultsGame {
    return this.game;
  }

  view(): SharedRoomView {
    return {
      roomId: this.access.roomId,
      role: this.access.role,
      connection: this.connection,
      confirmedSeq: this.confirmedSeq,
      pendingCount: this.pending.length,
      timelineCursor: this.timelineCursor,
      timelineLength: this.timeline.length,
      live: this.timelineCursor === this.timeline.length,
      ...(this.playerUrl === undefined ? {} : { playerUrl: this.playerUrl }),
      ...(this.forkUrl === undefined ? {} : { forkUrl: this.forkUrl }),
    };
  }

  proposeAction(option: LegalActionOption): boolean {
    if (!this.canPropose()) return false;
    const source = this.game.runtime.actionSource(option);
    const result = this.game.perform(option);
    if (!result.ok) return false;
    this.pending.push({
      commandId: crypto.randomUUID(),
      kind: "action",
      source,
      forward: result.commit.transaction.forward,
      inverse: result.commit.transaction.inverse,
      postHash: this.game.snapshot().stateHash,
    });
    this.notify(
      "Optimistic action queued; one canonical proposal may be in flight.",
    );
    this.sendOldest();
    return true;
  }

  proposeDesigner(source: string): boolean {
    if (!this.canPropose() || this.access.role !== "designer") return false;
    const validation = validateDesignerCandidate(source);
    if (!validation.ok) return false;
    const result = this.game.registerBlueGateScenario();
    if (!result.ok) return false;
    this.pending.push({
      commandId: crypto.randomUUID(),
      kind: "code",
      source,
      forward: result.commit.transaction.forward,
      inverse: result.commit.transaction.inverse,
      postHash: this.game.snapshot().stateHash,
    });
    this.notify("Optimistic Designer cell queued for the persistent room.");
    this.sendOldest();
    return true;
  }

  previous(): boolean {
    if (this.pending.length > 0 || this.timelineCursor === 0) return false;
    const entry = this.timeline[this.timelineCursor - 1];
    if (entry?.patch !== null && entry?.patch !== undefined)
      this.game.runtime.store.applyPatch(entry.patch.inverse);
    this.timelineCursor -= 1;
    this.notify(`Viewing committed prefix ${String(this.timelineCursor)}.`);
    return true;
  }

  next(): boolean {
    if (this.pending.length > 0 || this.timelineCursor >= this.timeline.length)
      return false;
    const entry = this.timeline[this.timelineCursor];
    if (entry?.patch !== null && entry?.patch !== undefined)
      this.game.runtime.store.applyPatch(entry.patch.forward);
    this.timelineCursor += 1;
    this.notify(
      this.timelineCursor === this.timeline.length
        ? "Returned to the live room head."
        : `Viewing committed prefix ${String(this.timelineCursor)}.`,
    );
    return true;
  }

  returnLive(): void {
    while (this.next()) {
      // Applying retained forward patches avoids source replay.
    }
  }

  async forkFromHere(): Promise<RoomCreation> {
    if (this.pending.length > 0)
      throw new Error("Wait for pending cells before forking");
    const response = await fetch(`/api/rooms/${this.access.roomId}/fork`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-room-capability": this.access.capability,
      },
      body: JSON.stringify({ seq: this.timelineCursor }),
    });
    if (!response.ok) throw new Error("Could not fork this room prefix");
    const creation: RoomCreation = await response.json();
    this.forkUrl = creation.designerUrl;
    this.notify(
      "Fork created from the selected committed prefix; parent is unchanged.",
    );
    return creation;
  }

  destroy(): void {
    this.destroyed = true;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.socket?.close(1000, "Client left room");
  }

  private canPropose(): boolean {
    return (
      this.connection === "connected" &&
      this.timelineCursor === this.timeline.length
    );
  }

  private connect(): void {
    this.connection = this.confirmedSeq === 0 ? "connecting" : "reconnecting";
    this.notify("Connecting to the persistent room…");
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(
      `${protocol}//${location.host}/api/rooms/${this.access.roomId}/socket`,
    );
    this.socket = socket;
    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "room.join",
          capability: this.access.capability,
          clientId: clientId(),
          lastSeq: this.confirmedSeq,
        }),
      );
    });
    socket.addEventListener("message", (event) => this.receive(event.data));
    socket.addEventListener("close", () => {
      if (this.destroyed) return;
      this.connection = "reconnecting";
      this.notify(
        "Connection interrupted; committed state is retained while reconnecting.",
      );
      this.reconnectTimer = window.setTimeout(() => this.connect(), 500);
    });
  }

  private receive(raw: unknown): void {
    if (typeof raw !== "string") return;
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (message.type === "room.snapshot") {
      this.receiveSnapshot(message.snapshot as RoomSnapshot);
      return;
    }
    if (message.type === "cell.committed") {
      this.receiveCommitted(message.cell as CommittedCell);
      return;
    }
    if (message.type === "cell.rebase_required") {
      this.inFlightCommandId = null;
      for (const cell of (message.cells as CommittedCell[] | undefined) ?? [])
        if (cell.seq > this.confirmedSeq) this.applyAuthoritative(cell);
      this.sendOldest();
      return;
    }
    if (message.type === "state.hash_mismatch") {
      this.connection = "conflict";
      this.notify(
        "State hash mismatch detected; rebuilding from the authoritative prefix.",
      );
      void this.recoverDivergence();
      return;
    }
    if (message.type === "cell.rejected" || message.type === "room.error") {
      this.connection = "conflict";
      const code = typeof message.code === "string" ? message.code : "unknown";
      this.notify(`Room rejected a message: ${code}.`);
    }
  }

  private receiveSnapshot(snapshot: RoomSnapshot): void {
    if (this.confirmedSeq === 0 && this.timeline.length === 0) {
      this.game = createCuratedCheckpoint();
      this.confirmedHash = this.game.snapshot().stateHash;
    }
    for (const cell of snapshot.cells)
      if (cell.seq > this.confirmedSeq) this.applyAuthoritative(cell);
    this.confirmedSeq = snapshot.headSeq;
    this.confirmedHash = snapshot.headStateHash;
    this.connection = "connected";
    this.notify(
      `Persistent room connected at sequence ${String(this.confirmedSeq)}.`,
    );
    this.reportHash();
    this.sendOldest();
  }

  private receiveCommitted(cell: CommittedCell): void {
    if (cell.seq <= this.confirmedSeq) return;
    const first = this.pending[0];
    if (first?.commandId === cell.commandId) {
      this.pending.shift();
      this.inFlightCommandId = null;
      this.timeline.push({ cell, patch: first });
      this.timelineCursor = this.timeline.length;
      this.confirmedSeq = cell.seq;
      this.confirmedHash = cell.canonicalPostStateHash ?? this.confirmedHash;
      if (first.postHash !== this.confirmedHash) {
        this.connection = "conflict";
        this.notify(
          "Committed state attestation differs from the optimistic result.",
        );
        return;
      }
      this.notify(
        `Cell ${String(cell.seq)} committed once in global room order.`,
      );
      this.reportHash();
      this.sendOldest();
      return;
    }
    this.applyAuthoritative(cell);
    this.notify(
      `Applied authoritative cell ${String(cell.seq)} and rebased the pending tail.`,
    );
    this.reportHash();
    this.sendOldest();
  }

  private applyAuthoritative(cell: CommittedCell): void {
    this.restoreLivePatches();
    for (const pending of [...this.pending].reverse())
      this.game.runtime.store.applyPatch(pending.inverse);
    const applied = applySharedCell(this.game, cell);
    if (applied !== null && !applied.ok) {
      this.connection = "conflict";
      throw new Error(applied.failure.message);
    }
    const patch: PatchPair | null =
      applied === null
        ? null
        : {
            forward: applied.commit.transaction.forward,
            inverse: applied.commit.transaction.inverse,
          };
    this.timeline.push({ cell, patch });
    this.timelineCursor = this.timeline.length;
    this.confirmedSeq = cell.seq;
    this.confirmedHash =
      cell.canonicalPostStateHash ?? this.game.snapshot().stateHash;

    const priorPending = this.pending;
    this.pending = [];
    this.inFlightCommandId = null;
    for (const pending of priorPending) {
      try {
        const result =
          pending.kind === "action"
            ? this.game.perform(
                resolveCanonicalAction(this.game, pending.source),
              )
            : this.game.registerBlueGateScenario();
        if (!result.ok) continue;
        this.pending.push({
          ...pending,
          forward: result.commit.transaction.forward,
          inverse: result.commit.transaction.inverse,
          postHash: this.game.snapshot().stateHash,
        });
      } catch {
        this.connection = "conflict";
      }
    }
  }

  private sendOldest(): void {
    if (
      this.socket?.readyState !== WebSocket.OPEN ||
      this.connection !== "connected" ||
      this.inFlightCommandId !== null
    )
      return;
    const pending = this.pending[0];
    if (pending === undefined) return;
    const proposal: CellProposal = {
      commandId: pending.commandId,
      roomId: this.access.roomId,
      baseSeq: this.confirmedSeq,
      baseStateHash: this.confirmedHash,
      kind: pending.kind,
      source: pending.source,
      author: {
        clientId: clientId(),
        role: this.access.role,
        ...(this.access.role === "player" ? { seatId: "human" } : {}),
      },
      clientLanguageVersion: APP_LANGUAGE_VERSION,
      clientFrameworkVersion: APP_FRAMEWORK_VERSION,
      proposedPostStateHash: pending.postHash,
    };
    this.inFlightCommandId = pending.commandId;
    this.socket.send(JSON.stringify({ type: "cell.propose", proposal }));
  }

  private reportHash(): void {
    if (this.socket?.readyState !== WebSocket.OPEN || this.pending.length > 0)
      return;
    this.socket.send(
      JSON.stringify({
        type: "state.hash.report",
        seq: this.confirmedSeq,
        stateHash: this.game.snapshot().stateHash,
      }),
    );
  }

  private restoreLivePatches(): void {
    while (this.timelineCursor < this.timeline.length) {
      const entry = this.timeline[this.timelineCursor];
      if (entry?.patch !== null && entry?.patch !== undefined)
        this.game.runtime.store.applyPatch(entry.patch.forward);
      this.timelineCursor += 1;
    }
  }

  private async recoverDivergence(): Promise<void> {
    if (this.pending.length > 0) {
      for (const pending of [...this.pending].reverse())
        this.game.runtime.store.applyPatch(pending.inverse);
      this.pending = [];
      this.inFlightCommandId = null;
    }
    try {
      const response = await fetch(
        `/api/rooms/${this.access.roomId}/snapshot?afterSeq=0`,
        { headers: { "x-room-capability": this.access.capability } },
      );
      if (!response.ok) throw new Error("Authoritative snapshot unavailable");
      const snapshot: RoomSnapshot = await response.json();
      this.game = createCuratedCheckpoint();
      this.timeline = [];
      this.timelineCursor = 0;
      this.confirmedSeq = 0;
      this.confirmedHash = this.game.snapshot().stateHash;
      for (const cell of snapshot.cells) this.applyAuthoritative(cell);
      const rebuiltHash = this.game.snapshot().stateHash;
      if (rebuiltHash !== snapshot.headStateHash)
        throw new Error(
          "Rebuilt state still differs from the canonical attestation",
        );
      this.connection = "connected";
      this.notify(
        "Divergence recovery rebuilt the authoritative room exactly.",
      );
      this.reportHash();
    } catch (error) {
      this.connection = "conflict";
      this.notify(
        error instanceof Error
          ? error.message
          : "Divergence recovery could not rebuild the room.",
      );
    }
  }

  private notify(message: string): void {
    this.update(this.game, this.view(), message);
  }
}

function capabilityKey(roomId: string): string {
  return `board-game-computer:room:${roomId}`;
}

function clientId(): string {
  const key = "board-game-computer:client-id";
  const existing = sessionStorage.getItem(key);
  if (existing !== null) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}
