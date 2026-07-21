import { env, exports } from "cloudflare:workers";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type {
  CellProposal,
  RoomCreation,
  RoomSnapshot,
} from "../../src/shared/room";
import {
  APP_FRAMEWORK_VERSION,
  APP_LANGUAGE_VERSION,
} from "../../src/shared/versions";

const origin = "https://example.test";

describe("persistent room protocol", () => {
  it("creates capability URLs, persists cells, and rejects an invalid capability", async () => {
    const room = await createRoom("initial-hash");
    expect(room.designerUrl).toContain(`#designer=`);
    expect(room.playerUrl).toContain(`#player=`);
    expect(room.designerUrl).not.toContain("?designer=");

    const unauthorized = await exports.default.fetch(
      new Request(`${origin}/api/rooms/${room.roomId}/snapshot`, {
        headers: { "x-room-capability": "not-a-valid-capability-value" },
      }),
    );
    expect(unauthorized.status).toBe(401);

    const capability = capabilityFrom(room.designerUrl, "designer");
    const first = proposal(room.roomId, "command-a", "designer", {
      baseSeq: 0,
      baseStateHash: "initial-hash",
      proposedPostStateHash: "hash-a",
    });
    const committed = await propose(room.roomId, capability, first);
    expect(committed).toMatchObject({
      type: "cell.committed",
      cell: {
        seq: 1,
        commandId: "command-a",
        canonicalPostStateHash: "hash-a",
      },
    });

    const snapshot = await getSnapshot(room.roomId, capability);
    expect(snapshot).toMatchObject({ headSeq: 1, headStateHash: "hash-a" });
    expect(snapshot.cells).toHaveLength(1);
    expect(snapshot.cells[0]).toMatchObject({ roomId: room.roomId, seq: 1 });
  });

  it("assigns one sequence, keeps duplicate commands idempotent, and rejects stale bases", async () => {
    const room = await createRoom("base-hash");
    const capability = capabilityFrom(room.designerUrl, "designer");
    const first = proposal(room.roomId, "dedupe-command", "designer", {
      baseSeq: 0,
      baseStateHash: "base-hash",
      proposedPostStateHash: "first-hash",
    });
    await propose(room.roomId, capability, first);
    const duplicate = await propose(room.roomId, capability, first);
    expect(duplicate).toMatchObject({
      type: "cell.committed",
      idempotent: true,
      cell: { seq: 1 },
    });

    const stale = await propose(
      room.roomId,
      capability,
      proposal(room.roomId, "stale-command", "designer", {
        baseSeq: 0,
        baseStateHash: "base-hash",
        proposedPostStateHash: "stale-hash",
      }),
    );
    expect(stale).toMatchObject({
      type: "cell.rebase_required",
      headSeq: 1,
      headStateHash: "first-hash",
      cells: [{ commandId: "dedupe-command", seq: 1 }],
    });
    expect((await getSnapshot(room.roomId, capability)).cells).toHaveLength(1);
  });

  it("allows Player action cells but denies general Designer source", async () => {
    const room = await createRoom("base-hash");
    const playerCapability = capabilityFrom(room.playerUrl, "player");
    const action = proposal(room.roomId, "player-action", "player", {
      baseSeq: 0,
      baseStateHash: "base-hash",
      proposedPostStateHash: "action-hash",
    });
    expect(await propose(room.roomId, playerCapability, action)).toMatchObject({
      type: "cell.committed",
      cell: { seq: 1, kind: "action" },
    });

    const code: CellProposal = {
      ...proposal(room.roomId, "player-code", "player", {
        baseSeq: 1,
        baseStateHash: "action-hash",
        proposedPostStateHash: "code-hash",
      }),
      kind: "code",
      source: "let forbidden = 1;",
    };
    const denied = await propose(room.roomId, playerCapability, code);
    expect(denied).toMatchObject({
      type: "cell.rejected",
      code: "capability_denied",
    });

    const designerRoom = await createRoom("designer-base");
    const designerCapability = capabilityFrom(
      designerRoom.designerUrl,
      "designer",
    );
    const disguisedAction: CellProposal = {
      ...proposal(designerRoom.roomId, "disguised-code", "designer", {
        baseSeq: 0,
        baseStateHash: "designer-base",
        proposedPostStateHash: "invalid-hash",
      }),
      source: "let arbitrary = 1;",
    };
    expect(
      await propose(designerRoom.roomId, designerCapability, disguisedAction),
    ).toMatchObject({ type: "cell.rejected", code: "source_rejected" });
  });

  it("forks an immutable prefix into a separately capable child room", async () => {
    const parent = await createRoom("base-hash");
    const capability = capabilityFrom(parent.designerUrl, "designer");
    await propose(
      parent.roomId,
      capability,
      proposal(parent.roomId, "parent-a", "designer", {
        baseSeq: 0,
        baseStateHash: "base-hash",
        proposedPostStateHash: "hash-a",
      }),
    );
    await propose(
      parent.roomId,
      capability,
      proposal(parent.roomId, "parent-b", "designer", {
        baseSeq: 1,
        baseStateHash: "hash-a",
        proposedPostStateHash: "hash-b",
      }),
    );

    const response = await exports.default.fetch(
      new Request(`${origin}/api/rooms/${parent.roomId}/fork`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-room-capability": capability,
        },
        body: JSON.stringify({ seq: 1 }),
      }),
    );
    expect(response.status).toBe(201);
    const child: RoomCreation = await response.json();
    expect(child.roomId).not.toBe(parent.roomId);
    expect(child.snapshot).toMatchObject({
      parentRoomId: parent.roomId,
      parentSeq: 1,
      headSeq: 1,
      headStateHash: "hash-a",
    });
    expect(child.snapshot.cells.map((cell) => cell.commandId)).toEqual([
      "parent-a",
    ]);
    expect((await getSnapshot(parent.roomId, capability)).headSeq).toBe(2);
  });

  it("persists cells and WebSocket attachments across Durable Object eviction", async () => {
    const room = await createRoom("base-hash");
    const capability = capabilityFrom(room.designerUrl, "designer");
    await propose(
      room.roomId,
      capability,
      proposal(room.roomId, "before-eviction", "designer", {
        baseSeq: 0,
        baseStateHash: "base-hash",
        proposedPostStateHash: "persisted-hash",
      }),
    );
    const stub = env.ROOMS.get(env.ROOMS.idFromName(room.roomId));
    const response = await stub.fetch(
      new Request("https://room.internal/socket", {
        headers: { Upgrade: "websocket" },
      }),
    );
    expect(response.status).toBe(101);
    const socket = response.webSocket;
    if (socket === null) throw new Error("Expected WebSocket upgrade");
    socket.accept();
    const joined = nextSocketMessage(socket);
    socket.send(
      JSON.stringify({
        type: "room.join",
        capability,
        clientId: "eviction-client",
        lastSeq: 0,
      }),
    );
    expect(await joined).toMatchObject({
      type: "room.snapshot",
      snapshot: { headSeq: 1 },
    });
    const mismatch = nextSocketMessage(socket);
    socket.send(
      JSON.stringify({
        type: "state.hash.report",
        seq: 1,
        stateHash: "wrong-client-hash",
      }),
    );
    expect(await mismatch).toMatchObject({
      type: "state.hash_mismatch",
      seq: 1,
      expectedHash: "persisted-hash",
    });
    await expect(
      runInDurableObject(stub, (_instance, state) => {
        const attachment: unknown = state
          .getWebSockets()[0]
          ?.deserializeAttachment();
        return attachment;
      }),
    ).resolves.toMatchObject({
      joined: true,
      clientId: "eviction-client",
      role: "designer",
    });

    await evictDurableObject(stub);
    const tail = nextSocketMessage(socket);
    socket.send(JSON.stringify({ type: "room.tail.request", afterSeq: 0 }));
    expect(await tail).toMatchObject({
      type: "room.cells",
      cells: [{ commandId: "before-eviction", seq: 1 }],
    });
    expect(await getSnapshot(room.roomId, capability)).toMatchObject({
      headSeq: 1,
      headStateHash: "persisted-hash",
    });
    socket.close(1000, "test complete");
  });
});

async function createRoom(initialStateHash: string): Promise<RoomCreation> {
  const response = await exports.default.fetch(
    new Request(`${origin}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: "shifting-vaults-judge-v1",
        initialStateHash,
      }),
    }),
  );
  expect(response.status).toBe(201);
  return response.json<RoomCreation>();
}

function proposal(
  roomId: string,
  commandId: string,
  role: "designer" | "player",
  state: Pick<
    CellProposal,
    "baseSeq" | "baseStateHash" | "proposedPostStateHash"
  >,
): CellProposal {
  return {
    commandId,
    roomId,
    ...state,
    kind: "action",
    source:
      'performAction("move-explorer", { actorId: "human", destinationId: "azure-gate" });',
    author: {
      clientId: `client-${role}`,
      role,
      ...(role === "player" ? { seatId: "human" } : {}),
    },
    clientLanguageVersion: APP_LANGUAGE_VERSION,
    clientFrameworkVersion: APP_FRAMEWORK_VERSION,
  };
}

async function propose(
  roomId: string,
  capability: string,
  cell: CellProposal,
): Promise<Record<string, unknown>> {
  const response = await exports.default.fetch(
    new Request(`${origin}/api/rooms/${roomId}/propose`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-room-capability": capability,
      },
      body: JSON.stringify(cell),
    }),
  );
  return response.json<Record<string, unknown>>();
}

async function getSnapshot(
  roomId: string,
  capability: string,
): Promise<RoomSnapshot> {
  const response = await exports.default.fetch(
    new Request(`${origin}/api/rooms/${roomId}/snapshot`, {
      headers: { "x-room-capability": capability },
    }),
  );
  expect(response.status).toBe(200);
  return response.json<RoomSnapshot>();
}

function capabilityFrom(url: string, key: "designer" | "player"): string {
  const capability = new URL(url).hash.slice(1).split(`${key}=`)[1];
  if (capability === undefined) throw new Error("Missing capability fragment");
  return capability;
}

function nextSocketMessage(
  socket: WebSocket,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("WebSocket message timed out")),
      2_000,
    );
    socket.addEventListener(
      "message",
      (event) => {
        clearTimeout(timer);
        if (typeof event.data !== "string") {
          reject(new Error("Expected a text WebSocket message"));
          return;
        }
        resolve(JSON.parse(event.data) as Record<string, unknown>);
      },
      { once: true },
    );
  });
}
