import { describe, expect, it, vi } from "vitest";

import {
  resolveChosenOption,
  runDesignerRepairLoop,
} from "../../../src/app/designer-orchestrator";
import {
  BLUE_GATE_HERO_SOURCE,
  commitDesignerCandidate,
  ShiftingVaultsGame,
  speculateDesignerCandidate,
  validateDesignerCandidate,
} from "../../../src/sample";
import {
  DesignerCandidateSchema,
  DesignerRequestSchema,
} from "../../../src/shared/ai";
import { readAiConfig } from "../../../src/worker/ai/config";
import {
  AI_CONTEXT_MAX_CHARS,
  buildDesignerContext,
} from "../../../src/worker/ai/context";
import type { Env } from "../../../src/worker/env";

const validCandidate = {
  source: BLUE_GATE_HERO_SOURCE,
  summary: "Blue gates rotate their linked room.",
  expected_effects: ["Mirror Gallery rotates clockwise."],
};

describe("ai contracts and local validation", () => {
  it("keeps bounded context, redacts secret-like values, and preserves setup first", () => {
    const request = DesignerRequestSchema.parse({
      roomId: "room-1",
      request: `Use ${["sk", "exampleSecretValue123456789"].join("-")} safely`,
      baseSeq: 3,
      baseHash: "abc",
      sourceCells: [
        { id: "chat", kind: "chat", source: "x".repeat(12_000) },
        { id: "setup", kind: "setup", source: "const setup = true;" },
        ...Array.from({ length: 10 }, (_, index) => ({
          id: `action-${String(index)}`,
          kind: "action" as const,
          source: "a".repeat(5_000),
        })),
      ],
      inspection: "authorization: bearer-secret",
      attempt: 1,
      diagnostics: [],
    });
    const context = buildDesignerContext(request);
    expect(context.length).toBeLessThanOrEqual(AI_CONTEXT_MAX_CHARS);
    expect(context).toContain("[setup:setup]");
    expect(context).not.toContain("exampleSecretValue");
    expect(context).not.toContain("bearer-secret");
  });

  it("rejects extra strict-envelope properties", () => {
    expect(() =>
      DesignerCandidateSchema.parse({ ...validCandidate, executable: true }),
    ).toThrow();
  });

  it("accepts only the supported hero Scenario source", () => {
    expect(validateDesignerCandidate(BLUE_GATE_HERO_SOURCE)).toEqual({
      ok: true,
    });
    const invalid = validateDesignerCandidate("while (true) {}");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok)
      expect(invalid.diagnostic.code).toBe("TS_UNSUPPORTED_NODE");
  });

  it("speculatively executes and exactly rolls back a valid Designer cell", () => {
    const game = new ShiftingVaultsGame();
    const before = game.snapshot().stateHash;
    expect(speculateDesignerCandidate(game, BLUE_GATE_HERO_SOURCE)).toEqual({
      ok: true,
    });
    expect(game.snapshot().stateHash).toBe(before);
    expect(game.snapshot().zones["mirror-gallery"]?.rotation).toBe(0);
  });

  it("repairs syntax failure and commits only the valid second candidate", async () => {
    const game = new ShiftingVaultsGame();
    const before = game.snapshot().stateHash;
    const receivedDiagnostics: unknown[] = [];
    let generation = 0;
    const generate = vi.fn((_: number, diagnostics: unknown[]) => {
      receivedDiagnostics.push(...diagnostics);
      generation += 1;
      return Promise.resolve(
        generation === 1
          ? { ...validCandidate, source: "Scenario(" }
          : validCandidate,
      );
    });
    const result = await runDesignerRepairLoop({
      baseHash: before,
      currentHash: () => game.snapshot().stateHash,
      generate,
      validate: validateDesignerCandidate,
      commit: (source) => commitDesignerCandidate(game, source),
    });
    expect(result).toMatchObject({ ok: true, attempts: 2 });
    expect(receivedDiagnostics).toContainEqual(
      expect.objectContaining({ phase: "parse" }),
    );
    expect(game.snapshot().stateHash).not.toBe(before);
  });

  it("repairs a speculative runtime failure without committing the failed candidate", async () => {
    let committed = 0;
    const runtimeFailure = {
      code: "TS_INVARIANT_FAILED",
      phase: "invariant" as const,
      message: "Conservation failed",
    };
    const result = await runDesignerRepairLoop({
      baseHash: "one",
      currentHash: () => "one",
      generate: vi.fn().mockResolvedValue(validCandidate),
      validate: () => ({ ok: true }),
      commit: () =>
        committed++ === 0
          ? { ok: false, diagnostic: runtimeFailure }
          : { ok: true },
    });
    expect(result).toMatchObject({ ok: true, attempts: 2 });
    expect(committed).toBe(2);
  });

  it("stops after three failures and leaves the room unchanged", async () => {
    const game = new ShiftingVaultsGame();
    const before = game.snapshot().stateHash;
    const result = await runDesignerRepairLoop({
      baseHash: before,
      currentHash: () => game.snapshot().stateHash,
      generate: vi.fn().mockResolvedValue({
        ...validCandidate,
        source: "fetch('https://forbidden.test')",
      }),
      validate: validateDesignerCandidate,
      commit: (source) => commitDesignerCandidate(game, source),
    });
    expect(result).toMatchObject({ ok: false, attempts: 3 });
    expect(game.snapshot().stateHash).toBe(before);
  });

  it("revalidates a candidate when the base hash changes before commit", async () => {
    const validate = vi.fn(() => ({ ok: true as const }));
    const result = await runDesignerRepairLoop({
      baseHash: "old",
      currentHash: () => "new",
      generate: vi.fn().mockResolvedValue(validCandidate),
      validate,
      commit: () => ({ ok: true }),
    });
    expect(result).toMatchObject({ ok: true, revalidated: true });
    expect(validate).toHaveBeenCalledOnce();
  });

  it("maps only a still-available opaque player option", () => {
    const first = { id: "literal-action-1" };
    const offered = new Map([["opaque-1", first]]);
    expect(
      resolveChosenOption({
        offered,
        chosenOptionId: "opaque-1",
        current: [first],
      }),
    ).toBe(first);
    expect(
      resolveChosenOption({
        offered,
        chosenOptionId: "unknown",
        current: [first],
      }),
    ).toBeUndefined();
    expect(
      resolveChosenOption({ offered, chosenOptionId: "opaque-1", current: [] }),
    ).toBeUndefined();
  });

  it("keeps model routing server-side and disables calls without the key", () => {
    const config = readAiConfig({ AI_ENABLED: "true" } as Env);
    expect(config.enabled).toBe(false);
    expect(config.designerModel).toBe("gpt-5.6");
    expect(config.playerModel).toBe("gpt-5.6-luna");
  });
});
