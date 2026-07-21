import { describe, expect, it } from "vitest";

import worker, { type Env } from "../../src/worker/index";

describe("worker shell", () => {
  it("returns a non-secret health payload", async () => {
    const env: Env = {
      ASSETS: {
        fetch: () => Promise.resolve(new Response("asset")),
      },
    };
    const response = await worker.fetch(
      new Request("https://example.test/api/health"),
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      service: "board-game-computer",
      phase: "implementation-shell",
    });
  });
});
