import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("deployed vertical slice", () => {
  it("returns health and version payloads without secrets", async () => {
    const health = await exports.default.fetch(
      new Request("https://example.test/api/health"),
    );
    const version = await exports.default.fetch(
      new Request("https://example.test/api/version"),
    );

    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toMatchObject({
      ok: true,
      service: "board-game-computer",
      phase: "vertical-slice",
    });
    expect(version.status).toBe(200);
    await expect(version.json()).resolves.toMatchObject({
      service: "board-game-computer",
      languageVersion: "board-game-computer-js-0.1",
      frameworkVersion: "board-game-computer-framework-0.1",
    });
  });

  it("reaches the SQLite Room Durable Object binding", async () => {
    const response = await env.ROOMS.getByName("m2-worker-test").fetch(
      new Request("https://room.internal/health"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      durableObject: "RoomObject",
      storage: "sqlite",
      initialized: true,
    });
  });
});
