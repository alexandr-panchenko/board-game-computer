import { describe, expect, it } from "vitest";

import {
  PRISM_FOUNDRY_GENESIS,
  PrismFoundryRoom,
  RUBY_RESONANCE_SOURCE,
  cardById,
  decodeCanonicalAction,
  resolveCanonicalAction,
} from "../../../src/sample";

describe("Prism Foundry interpreted sample", () => {
  it(
    "builds every tabletop component by executing the 16-cell genesis program",
    { timeout: 30_000 },
    () => {
      const first = new PrismFoundryRoom();
      const second = new PrismFoundryRoom();
      const snapshot = first.snapshot();

      expect(first.program().cells).toHaveLength(16);
      expect(first.program().cells.map((cell) => cell.source)).toEqual(
        PRISM_FOUNDRY_GENESIS.map((cell) => cell.source),
      );
      expect(first.program().cells.every((cell) => cell.patchCount > 0)).toBe(
        true,
      );
      expect(snapshot.stateHash).toBe(second.snapshot().stateHash);
      expect(snapshot.bank).toEqual({
        ruby: 5,
        sapphire: 5,
        emerald: 5,
        amber: 5,
        prism: 3,
      });
      expect(snapshot.tokens).toHaveLength(23);
      expect(snapshot.cards).toHaveLength(18);
      expect(snapshot.market).toHaveLength(6);
      expect(snapshot.deck).toHaveLength(12);
      expect(snapshot.players.human).toMatchObject({
        name: "Mara",
        prestige: 0,
      });
      expect(snapshot.players.ai).toMatchObject({ name: "Ivo", prestige: 0 });
    },
  );

  it(
    "moves two finite tokens and appends the canonical action to the same program",
    { timeout: 30_000 },
    () => {
      const game = new PrismFoundryRoom();
      const option = game
        .legalActions("human")
        .find(
          (candidate) =>
            candidate.actionId === "take-crystals" &&
            candidate.parameters.first === "ruby" &&
            candidate.parameters.second === "sapphire",
        );
      expect(option).toBeDefined();
      const source = game.actionSource(option!);
      expect(decodeCanonicalAction(source)).toEqual({
        actionId: "take-crystals",
        actorId: "human",
        parameters: { first: "ruby", second: "sapphire" },
      });
      expect(resolveCanonicalAction(game, source).id).toBe(option?.id);
      const result = game.perform(option!);
      expect(result.ok).toBe(true);
      const snapshot = game.snapshot();
      expect(snapshot.bank.ruby).toBe(4);
      expect(snapshot.bank.sapphire).toBe(4);
      expect(
        snapshot.tokens.filter((token) => token.containerId === "mara-mat"),
      ).toHaveLength(2);
      expect(snapshot.activePlayerId).toBe("ai");
      expect(game.program().cells.at(-1)).toMatchObject({
        kind: "action",
        source,
      });
    },
  );

  it(
    "pays, discounts, moves a market card, refills deterministically, and reverses exactly",
    { timeout: 30_000 },
    () => {
      const game = new PrismFoundryRoom();
      performTake(game, "ruby", "sapphire");
      game.perform(game.chooseFallbackAction("ai"));
      const beforeBuy = game.snapshot().stateHash;
      const crimson = game
        .legalActions("human")
        .find(
          (option) =>
            option.actionId === "buy-card" &&
            option.parameters.cardId === "crimson-relay",
        );
      expect(crimson).toBeDefined();
      expect(game.perform(crimson!).ok).toBe(true);
      const purchased = game.snapshot();
      expect(cardById(purchased, "crimson-relay")).toMatchObject({
        location: "tableau",
        ownerId: "human",
      });
      expect(purchased.players.human).toMatchObject({
        prestige: 1,
        discounts: { ruby: 1 },
      });
      expect(purchased.market).toHaveLength(6);
      expect(purchased.market).toContain("ember-press");
      expect(game.undo()).toBe(true);
      expect(game.snapshot().stateHash).toBe(beforeBuy);
      expect(game.redo()).toBe(true);
      expect(game.snapshot().stateHash).toBe(purchased.stateHash);
    },
  );

  it(
    "speculates the supported Designer rule with exact rollback and commits it visibly",
    { timeout: 30_000 },
    () => {
      const game = new PrismFoundryRoom();
      const before = game.snapshot().stateHash;
      expect(game.speculateDesigner(RUBY_RESONANCE_SOURCE)).toEqual({
        ok: true,
      });
      expect(game.snapshot().stateHash).toBe(before);
      expect(game.commitDesigner(RUBY_RESONANCE_SOURCE).ok).toBe(true);
      expect(game.snapshot().houseRules).toEqual([
        { name: "Ruby resonance", when: "buy-ruby", then: "gain-prism" },
      ]);
      expect(game.program().cells.at(-1)).toMatchObject({
        kind: "designer",
        source: RUBY_RESONANCE_SOURCE,
      });
    },
  );

  it(
    "uses only ordinary registered actions to reach a real 8 Prestige ending",
    { timeout: 60_000 },
    () => {
      const game = new PrismFoundryRoom();
      const actions: string[] = [];
      let current = game.snapshot();
      for (let turn = 0; turn < 24 && current.result === null; turn += 1) {
        const option = game.chooseFallbackAction();
        actions.push(game.actionSource(option));
        const result = game.perform(option);
        expect(result.ok).toBe(true);
        current = game.snapshot();
      }
      const finished = current;
      expect(finished.result).toMatchObject({ type: "prestige-victory" });
      expect(finished.result?.prestige).toBeGreaterThanOrEqual(8);
      expect(finished.legalActions).toEqual([]);
      expect(
        actions.every((source) => source.startsWith("performAction(")),
      ).toBe(true);
    },
  );
});

function performTake(
  game: PrismFoundryRoom,
  first: string,
  second: string,
): void {
  const option = game
    .legalActions()
    .find(
      (candidate) =>
        candidate.actionId === "take-crystals" &&
        candidate.parameters.first === first &&
        candidate.parameters.second === second,
    );
  if (option === undefined) throw new Error("Expected take option");
  const result = game.perform(option);
  if (!result.ok) throw new Error(result.diagnostic.message);
}
