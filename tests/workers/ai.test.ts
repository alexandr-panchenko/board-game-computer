import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { BLUE_GATE_HERO_SOURCE } from "../../src/sample";
import type { DesignerRequest, PlayerRequest } from "../../src/shared/ai";
import type { AiGateway, GatewayResult } from "../../src/worker/ai/gateway";
import { AiGatewayError } from "../../src/worker/ai/gateway";
import type { Env } from "../../src/worker/env";
import {
  handleDesignerRequest,
  handlePlayerRequest,
} from "../../src/worker/index";

const designerRequest: DesignerRequest = {
  roomId: "worker-ai-room",
  request: "Add the documented blue-gate rule.",
  baseSeq: 3,
  baseHash: "state-hash",
  sourceCells: [],
  inspection: "Round 3, Mara in Clockwork Archive",
  attempt: 1,
  diagnostics: [],
};

const playerRequest: PlayerRequest = {
  roomId: "worker-player-room",
  baseHash: "state-hash",
  inspection: "Ivo has 2 AP",
  options: [
    {
      optionId: "opaque-1",
      label: "Move",
      consequence: "Move toward an unresolved room",
    },
  ],
};

describe("ai worker boundary", () => {
  it("streams progress and a strict Designer candidate from the configured model", async () => {
    const gateway = new FakeGateway();
    const response = await handleDesignerRequest(
      post("https://example.test/api/ai/designer", designerRequest),
      liveEnv("worker-designer-success"),
      gateway,
    );
    const body = await response.text();
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(body).toContain('"stage":"accepted"');
    expect(body).toContain('"type":"candidate"');
    expect(body).toContain(JSON.stringify(BLUE_GATE_HERO_SOURCE).slice(1, -1));
    expect(gateway.designerModel).toBe("gpt-5.6");
  });

  it("returns an offered opaque player option using Luna", async () => {
    const gateway = new FakeGateway();
    const response = await handlePlayerRequest(
      post("https://example.test/api/ai/player", playerRequest),
      liveEnv("worker-player-success"),
      gateway,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      choice: { option_id: "opaque-1" },
      model: "gpt-5.6-luna",
    });
    expect(gateway.playerModel).toBe("gpt-5.6-luna");
  });

  it("keeps deterministic fallback available when AI is disabled", async () => {
    const disabled = liveEnv("worker-disabled", {
      AI_ENABLED: "false",
      OPENAI_API_KEY: "unused-test-key",
    });
    const designer = await handleDesignerRequest(
      post("https://example.test/api/ai/designer", designerRequest),
      disabled,
      new FakeGateway(),
    );
    expect(await designer.text()).toContain("AI_DISABLED");
    const player = await handlePlayerRequest(
      post("https://example.test/api/ai/player", playerRequest),
      disabled,
      new FakeGateway(),
    );
    expect(player.status).toBe(503);
  });

  it("times out and cancels a stalled model request", async () => {
    const gateway = new FakeGateway();
    gateway.stall = true;
    const response = await handlePlayerRequest(
      post("https://example.test/api/ai/player", playerRequest),
      liveEnv("worker-timeout", { AI_REQUEST_TIMEOUT_MS: "1" }),
      gateway,
    );
    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      error: "AI_TIMEOUT",
    });
  });

  it("reports malformed strict tool output without leaking upstream details", async () => {
    const gateway = new FakeGateway();
    gateway.malformed = true;
    const response = await handlePlayerRequest(
      post("https://example.test/api/ai/player", playerRequest),
      liveEnv("worker-malformed"),
      gateway,
    );
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "AI_MALFORMED_TOOL_OUTPUT",
    });
  });

  it("enforces per-room and global budget reservations", async () => {
    const budget = env.AI_BUDGET.getByName(`budget-${crypto.randomUUID()}`);
    const request = {
      roomKey: "0123456789abcdef0123456789abcdef",
      estimatedChars: 40,
      maxRequestsPerDay: 1,
      maxEstimatedInputTokensPerDay: 100,
      maxRequestsPerRoomPerHour: 1,
    };
    const first = await budget.fetch(
      post("https://budget.internal/reserve", request),
    );
    const second = await budget.fetch(
      post("https://budget.internal/reserve", request),
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    await expect(second.json()).resolves.toMatchObject({
      code: "AI_GLOBAL_REQUEST_LIMIT",
    });

    const roomBudget = env.AI_BUDGET.getByName(
      `room-budget-${crypto.randomUUID()}`,
    );
    const roomLimited = { ...request, maxRequestsPerDay: 10 };
    expect(
      (
        await roomBudget.fetch(
          post("https://budget.internal/reserve", roomLimited),
        )
      ).status,
    ).toBe(200);
    const roomSecond = await roomBudget.fetch(
      post("https://budget.internal/reserve", roomLimited),
    );
    expect(roomSecond.status).toBe(429);
    await expect(roomSecond.json()).resolves.toMatchObject({
      code: "AI_ROOM_REQUEST_LIMIT",
    });

    const tokenBudget = env.AI_BUDGET.getByName(
      `token-budget-${crypto.randomUUID()}`,
    );
    const tokenLimited = await tokenBudget.fetch(
      post("https://budget.internal/reserve", {
        ...request,
        estimatedChars: 404,
        maxRequestsPerDay: 10,
        maxEstimatedInputTokensPerDay: 100,
      }),
    );
    expect(tokenLimited.status).toBe(429);
    await expect(tokenLimited.json()).resolves.toMatchObject({
      code: "AI_GLOBAL_TOKEN_LIMIT",
    });
  });
});

class FakeGateway implements AiGateway {
  designerModel = "";
  playerModel = "";
  stall = false;
  malformed = false;

  proposeDesigner(input: { model: string }): Promise<
    GatewayResult<{
      source: string;
      summary: string;
      expected_effects: string[];
    }>
  > {
    this.designerModel = input.model;
    return Promise.resolve({
      value: {
        source: BLUE_GATE_HERO_SOURCE,
        summary: "Blue gates rotate linked rooms.",
        expected_effects: ["Mirror Gallery rotates."],
      },
      model: input.model,
      inputTokens: 30,
      outputTokens: 20,
    });
  }

  async choosePlayer(input: {
    model: string;
    signal: AbortSignal;
  }): Promise<GatewayResult<{ option_id: string; reason: string }>> {
    this.playerModel = input.model;
    if (this.malformed)
      throw new AiGatewayError("AI_MALFORMED_TOOL_OUTPUT", "malformed", false);
    if (this.stall)
      await new Promise<never>((_, reject) =>
        input.signal.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          {
            once: true,
          },
        ),
      );
    return {
      value: { option_id: "opaque-1", reason: "Move toward the relic." },
      model: input.model,
      inputTokens: 20,
      outputTokens: 8,
    };
  }
}

function liveEnv(name: string, overrides: Partial<Env> = {}): Env {
  return {
    ASSETS: env.ASSETS,
    ROOMS: env.ROOMS,
    AI_BUDGET: {
      getByName: () => env.AI_BUDGET.getByName(name),
    },
    OPENAI_API_KEY: "test-only-key",
    AI_ENABLED: "true",
    ...overrides,
  };
}

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
