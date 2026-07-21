import {
  DesignerRequestSchema,
  PlayerRequestSchema,
  type DesignerStreamEvent,
} from "../shared/ai";
import {
  CreateRoomRequestSchema,
  ForkRoomRequestSchema,
  type CommittedCell,
  type RoomCreation,
  type RoomSnapshot,
} from "../shared/room";
import { readAiConfig } from "./ai/config";
import { OpenAiGateway, type AiGateway } from "./ai/gateway";
import {
  AiServiceError,
  choosePlayerAction,
  generateDesignerCandidate,
} from "./ai/service";
import type { Env } from "./env";
import { hashCapability } from "./room-object";

export type { Env } from "./env";

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "content-security-policy":
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "referrer-policy": "no-referrer",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

const json = (value: unknown, status = 200): Response =>
  withSecurity(
    Response.json(value, {
      status,
      headers: {
        "cache-control": "no-store",
      },
    }),
  );

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "board-game-computer",
        phase: "vertical-slice",
      });
    }

    if (url.pathname === "/api/version") {
      return json({
        service: "board-game-computer",
        commit: __BUILD_COMMIT__,
        builtAt: __BUILD_TIMESTAMP__,
        languageVersion: "board-game-computer-js-0.1",
        frameworkVersion: "board-game-computer-framework-0.1",
      });
    }

    if (url.pathname === "/api/room-health") {
      const room = env.ROOMS.getByName("vertical-slice-health");
      return withSecurity(
        await room.fetch(new Request("https://room.internal/health")),
      );
    }

    if (url.pathname === "/api/ai/status") {
      const config = readAiConfig(env);
      return json({
        enabled: config.enabled,
        designerModel: config.designerModel,
        playerModel: config.playerModel,
        fallbackAvailable: true,
      });
    }

    if (url.pathname === "/api/ai/designer" && request.method === "POST") {
      return handleDesignerRequest(request, env);
    }

    if (url.pathname === "/api/ai/player" && request.method === "POST") {
      return handlePlayerRequest(request, env);
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      return handleCreateRoom(request, env);
    }

    const roomRoute = matchRoomRoute(url.pathname);
    if (roomRoute !== null) {
      const room = env.ROOMS.getByName(roomRoute.roomId);
      if (roomRoute.operation === "socket") {
        const origin = request.headers.get("origin");
        if (origin !== null && origin !== url.origin)
          return json({ error: "origin_denied" }, 403);
        return room.fetch(new Request("https://room.internal/socket", request));
      }
      if (roomRoute.operation === "snapshot" && request.method === "GET") {
        return withSecurity(
          await room.fetch(
            new Request(`https://room.internal/snapshot${url.search}`, request),
          ),
        );
      }
      if (roomRoute.operation === "propose" && request.method === "POST") {
        return withSecurity(
          await room.fetch(
            new Request("https://room.internal/propose", request),
          ),
        );
      }
      if (roomRoute.operation === "fork" && request.method === "POST") {
        return handleForkRoom(request, env, roomRoute.roomId);
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "not_found" }, 404);
    }

    return withSecurity(await env.ASSETS.fetch(request));
  },
};

export default worker;

export { RoomObject } from "./room-object";
export { BudgetObject } from "./budget-object";

async function handleCreateRoom(request: Request, env: Env): Promise<Response> {
  const parsed = CreateRoomRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success)
    return json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  const roomId = crypto.randomUUID();
  return createRoom(env, new URL(request.url).origin, roomId, parsed.data);
}

async function createRoom(
  env: Env,
  origin: string,
  roomId: string,
  input: {
    templateId: string;
    initialStateHash: string;
    parentRoomId?: string;
    parentSeq?: number;
    cells?: CommittedCell[];
  },
): Promise<Response> {
  const designerCapability = randomSecret();
  const playerCapability = randomSecret();
  const room = env.ROOMS.getByName(roomId);
  const initialized = await room.fetch(
    new Request("https://room.internal/internal/initialize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        roomId,
        ...input,
        designerCapabilityHash: await hashCapability(designerCapability),
        playerCapabilityHash: await hashCapability(playerCapability),
      }),
    }),
  );
  if (!initialized.ok)
    return json({ error: "room_initialization_failed" }, 500);
  const snapshot: RoomSnapshot = await initialized.json();
  const base = `${origin}/room/${roomId}`;
  const creation: RoomCreation = {
    roomId,
    designerUrl: `${base}#designer=${designerCapability}`,
    playerUrl: `${base}#player=${playerCapability}`,
    snapshot,
  };
  return json(creation, 201);
}

async function handleForkRoom(
  request: Request,
  env: Env,
  parentRoomId: string,
): Promise<Response> {
  const parsed = ForkRoomRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success)
    return json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  const parent = env.ROOMS.getByName(parentRoomId);
  const snapshotResponse = await parent.fetch(
    new Request("https://room.internal/snapshot?afterSeq=0", {
      headers: {
        "x-room-capability": request.headers.get("x-room-capability") ?? "",
      },
    }),
  );
  if (!snapshotResponse.ok)
    return json({ error: "unauthorized" }, snapshotResponse.status);
  const snapshot: RoomSnapshot = await snapshotResponse.json();
  if (parsed.data.seq > snapshot.headSeq)
    return json({ error: "invalid_prefix" }, 400);
  const cells = snapshot.cells
    .filter((cell) => cell.seq <= parsed.data.seq)
    .map((cell) => ({ ...cell }));
  const initialStateHash =
    parsed.data.seq === 0
      ? (snapshot.cells[0]?.baseStateHash ?? snapshot.headStateHash)
      : (cells.at(-1)?.canonicalPostStateHash ?? snapshot.headStateHash);
  const childRoomId = crypto.randomUUID();
  const childCells = cells.map((cell) => ({ ...cell, roomId: childRoomId }));
  return createRoom(env, new URL(request.url).origin, childRoomId, {
    templateId: snapshot.templateId,
    initialStateHash,
    parentRoomId,
    parentSeq: parsed.data.seq,
    cells: childCells,
  });
}

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function matchRoomRoute(pathname: string): {
  roomId: string;
  operation: "snapshot" | "propose" | "socket" | "fork";
} | null {
  const match =
    /^\/api\/rooms\/([A-Za-z0-9._:-]+)\/(snapshot|propose|socket|fork)$/.exec(
      pathname,
    );
  if (match === null) return null;
  return {
    roomId: match[1]!,
    operation: match[2] as "snapshot" | "propose" | "socket" | "fork",
  };
}

function withSecurity(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS))
    headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleDesignerRequest(
  request: Request,
  env: Env,
  gateway?: AiGateway,
): Promise<Response> {
  const parsed = DesignerRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success)
    return json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  const config = readAiConfig(env);
  const activeGateway =
    gateway ?? new OpenAiGateway(env.OPENAI_API_KEY ?? "disabled");
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: DesignerStreamEvent) =>
        controller.enqueue(
          encoder.encode(
            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
          ),
        );
      send({ type: "progress", stage: "accepted" });
      send({ type: "progress", stage: "budget" });
      send({ type: "progress", stage: "generating" });
      try {
        const result = await generateDesignerCandidate(
          parsed.data,
          env,
          config,
          activeGateway,
          request.signal,
        );
        send({
          type: "candidate",
          candidate: result.value,
          model: result.model,
          latencyMs: result.latencyMs,
        });
      } catch (error) {
        const serviceError = normalizeServiceError(error);
        send({
          type: "error",
          code: serviceError.code,
          message: serviceError.message,
          retryable: serviceError.retryable,
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      ...SECURITY_HEADERS,
    },
  });
}

export async function handlePlayerRequest(
  request: Request,
  env: Env,
  gateway?: AiGateway,
): Promise<Response> {
  const parsed = PlayerRequestSchema.safeParse(await safeJson(request));
  if (!parsed.success)
    return json({ error: "invalid_request", issues: parsed.error.issues }, 400);
  const config = readAiConfig(env);
  const activeGateway =
    gateway ?? new OpenAiGateway(env.OPENAI_API_KEY ?? "disabled");
  try {
    const result = await choosePlayerAction(
      parsed.data,
      env,
      config,
      activeGateway,
      request.signal,
    );
    return json({
      choice: result.value,
      model: result.model,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    const serviceError = normalizeServiceError(error);
    return json(
      {
        error: serviceError.code,
        message: serviceError.message,
        retryable: serviceError.retryable,
      },
      serviceError.status,
    );
  }
}

async function safeJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 96_000) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function normalizeServiceError(error: unknown): AiServiceError {
  return error instanceof AiServiceError
    ? error
    : new AiServiceError(
        "AI_INTERNAL_ERROR",
        "The AI request failed; use the labelled fallback.",
        500,
        false,
      );
}
