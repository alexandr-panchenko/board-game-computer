import { describe, expect, it } from "vitest";

import { connectedRoomIds } from "../../../src/geometry";
import {
  applySharedCell,
  createCuratedCheckpoint,
  decodeCanonicalAction,
  DEFAULT_VAULT_SEED,
  ShiftingVaultsGame,
  type VaultSnapshot,
} from "../../../src/sample";

function perform(
  game: ShiftingVaultsGame,
  actionId: string,
  parameters: Record<string, string> = {},
) {
  const option = game
    .legalActions()
    .find(
      (candidate) =>
        candidate.actionId === actionId &&
        Object.entries(parameters).every(
          ([key, value]) => candidate.parameters[key] === value,
        ),
    );
  expect(
    option,
    `${actionId} ${JSON.stringify(parameters)} must be legal`,
  ).toBeDefined();
  const result = game.perform(option!);
  expect(result.ok).toBe(true);
  return result;
}

describe("Shifting Vaults", () => {
  it("creates the exact deterministic fresh setup", () => {
    const first = new ShiftingVaultsGame(DEFAULT_VAULT_SEED).snapshot();
    const second = new ShiftingVaultsGame(DEFAULT_VAULT_SEED).snapshot();

    expect(first.stateHash).toBe(second.stateHash);
    expect(Object.keys(first.zones)).toHaveLength(7);
    expect(
      Object.values(first.tokens).filter((token) => token.kind === "relic"),
    ).toHaveLength(4);
    expect(
      Object.values(first.tokens).filter((token) => token.kind === "hazard"),
    ).toHaveLength(2);
    expect(Object.keys(first.cards)).toHaveLength(8);
    expect(first.explorers["explorer-mara"]?.hand).toHaveLength(3);
    expect(first.explorers["explorer-ivo"]?.hand).toHaveLength(2);
    expect(first.threat.value).toBe(2);
    expect(first.round).toBe(1);
    expect(first.activeSeatId).toBe("human");
  });

  it("replays immutable history to the deterministic judge checkpoint", () => {
    const first = createCuratedCheckpoint().snapshot();
    const second = createCuratedCheckpoint().snapshot();
    expect(first.stateHash).toBe(second.stateHash);
    expect(first).toMatchObject({
      round: 3,
      activeSeatId: "human",
      threat: { value: 4 },
      result: null,
    });
    expect(first.explorers["explorer-mara"]).toMatchObject({
      zoneId: "clockwork-archive",
      relicCount: 1,
      actionPoints: 2,
    });
    expect(first.explorers["explorer-mara"]?.hand.length).toBeGreaterThan(0);
    expect(first.zones["mirror-gallery"]?.id).toBe("mirror-gallery");
  });

  it("decodes and applies canonical shared action source through legal options", () => {
    const direct = createCuratedCheckpoint();
    const remote = createCuratedCheckpoint();
    const option = direct
      .legalActions("human")
      .find(
        (candidate) =>
          candidate.actionId === "move-explorer" &&
          candidate.parameters.destinationId === "azure-gate",
      );
    expect(option).toBeDefined();
    const source = direct.runtime.actionSource(option!);
    expect(decodeCanonicalAction(source)).toEqual({
      actionId: "move-explorer",
      actorId: "human",
      parameters: { destinationId: "azure-gate" },
    });
    expect(direct.perform(option!).ok).toBe(true);
    expect(applySharedCell(remote, { kind: "action", source })?.ok).toBe(true);
    expect(remote.snapshot().stateHash).toBe(direct.snapshot().stateHash);
  });

  it("moves, searches, switches turns, and round-pressures through actions", () => {
    const game = new ShiftingVaultsGame();
    const before = game.snapshot().stateHash;
    perform(game, "move-explorer", { destinationId: "clockwork-archive" });
    const moved = game.snapshot().stateHash;
    expect(game.snapshot().explorers["explorer-mara"]?.actionPoints).toBe(1);
    expect(game.runtime.undo()).toBe(true);
    expect(game.snapshot().stateHash).toBe(before);
    expect(game.runtime.redo()).toBe(true);
    expect(game.snapshot().stateHash).toBe(moved);

    perform(game, "search-room");
    expect(
      game.legalActions().some((option) => option.actionId === "search-room"),
    ).toBe(false);
    perform(game, "end-turn");
    expect(game.snapshot().activeSeatId).toBe("ai");
    perform(game, "end-turn");
    expect(game.snapshot().round).toBe(2);
    expect(game.snapshot().threat.value).toBeGreaterThanOrEqual(3);
  });

  it("uses the deterministic fallback to complete a legal AI turn", () => {
    const game = new ShiftingVaultsGame();
    perform(game, "end-turn");
    const results = game.playFallbackTurn("ai");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(game.snapshot().activeSeatId).toBe("human");
  });

  it("resolves every tactic and enforces one card per turn", () => {
    for (const kind of ["gear", "sprint", "ward"] as const) {
      const game = new ShiftingVaultsGame();
      const option = game
        .legalActions()
        .find(
          (candidate) =>
            candidate.actionId === "play-tactic-card" &&
            candidate.parameters.cardId?.startsWith(kind),
        );
      expect(option, `${kind} must have a legal option`).toBeDefined();
      expect(game.perform(option!).ok).toBe(true);
      expect(
        game
          .legalActions()
          .some((candidate) => candidate.actionId === "play-tactic-card"),
      ).toBe(false);
    }

    const surveyGame = new ShiftingVaultsGame();
    perform(surveyGame, "end-turn");
    const survey = surveyGame
      .legalActions()
      .find(
        (candidate) =>
          candidate.actionId === "play-tactic-card" &&
          candidate.parameters.cardId?.startsWith("survey"),
      );
    expect(survey).toBeDefined();
    const surveyedRoom = survey!.parameters.targetId!;
    expect(surveyGame.perform(survey!).ok).toBe(true);
    const zone = surveyGame.snapshot().zones[surveyedRoom]!;
    expect(surveyGame.snapshot().tokens[zone.tokenId!]?.revealed).toBe(true);
    expect(zone.searched).toBe(false);
  });

  it("reshuffles discard deterministically when the draw pile empties", () => {
    const first = playUntilRefill(new ShiftingVaultsGame());
    const second = playUntilRefill(new ShiftingVaultsGame());
    expect(first.stateHash).toBe(second.stateHash);
    expect(first.deck.draw.length).toBeGreaterThan(0);
    const locations = [
      ...first.deck.draw,
      ...first.deck.discard,
      ...Object.values(first.explorers).flatMap((explorer) => explorer.hand),
    ];
    expect(locations).toHaveLength(8);
    expect(new Set(locations).size).toBe(8);
  });

  it("adds and fires the reversible blue-gate Scenario", () => {
    const game = new ShiftingVaultsGame();
    perform(game, "move-explorer", { destinationId: "clockwork-archive" });
    const registered = game.registerBlueGateScenario();
    expect(registered.ok).toBe(true);
    const beforeRotation = game.snapshot().zones["mirror-gallery"]!.rotation;
    perform(game, "move-explorer", { destinationId: "azure-gate" });
    expect(game.snapshot().zones["mirror-gallery"]?.rotation).toBe(
      (beforeRotation + 90) % 360,
    );
    expect(game.runtime.undo()).toBe(true);
    expect(game.snapshot().zones["mirror-gallery"]?.rotation).toBe(
      beforeRotation,
    );
    expect(game.runtime.undo()).toBe(true);
    perform(game, "move-explorer", { destinationId: "azure-gate" });
    expect(game.snapshot().zones["mirror-gallery"]?.rotation).toBe(
      beforeRotation,
    );
  });

  it("traceably skips blue-gate rotation when the linked room is occupied", () => {
    const game = new ShiftingVaultsGame();
    expect(game.registerBlueGateScenario().ok).toBe(true);
    perform(game, "end-turn");
    perform(game, "move-explorer", { destinationId: "clockwork-archive" });
    perform(game, "move-explorer", { destinationId: "azure-gate" });
    perform(game, "end-turn");
    perform(game, "end-turn");
    perform(game, "move-explorer", { destinationId: "mirror-gallery" });
    perform(game, "end-turn");
    perform(game, "move-explorer", { destinationId: "clockwork-archive" });
    const before = game.snapshot().zones["mirror-gallery"]!.rotation;
    const move = perform(game, "move-explorer", {
      destinationId: "azure-gate",
    });
    expect(game.snapshot().zones["mirror-gallery"]?.rotation).toBe(before);
    if (!move.ok) return;
    expect(
      move.commit.transaction.forward.trace.some(
        (event) => event.label === "scenario-skipped",
      ),
    ).toBe(true);
  });

  it("reaches explorer victory through registered actions only", () => {
    const game = new ShiftingVaultsGame();
    for (
      let step = 0;
      step < 100 && game.snapshot().result === null;
      step += 1
    ) {
      const snapshot = game.snapshot();
      if (snapshot.activeSeatId === "ai") {
        perform(game, "end-turn");
        continue;
      }
      const mara = snapshot.explorers["explorer-mara"]!;
      if (
        mara.zoneId !== "gatehouse" &&
        !snapshot.zones[mara.zoneId]!.searched
      ) {
        perform(game, "search-room");
        continue;
      }
      const targets =
        mara.relicCount >= 2
          ? ["gatehouse"]
          : Object.values(snapshot.zones)
              .filter((zone) => !zone.searched)
              .map((zone) => zone.id);
      const route = shortestRoute(snapshot, mara.zoneId, targets);
      const destinationId = route[1];
      const move = game
        .legalActions()
        .find(
          (option) =>
            option.actionId === "move-explorer" &&
            option.parameters.destinationId === destinationId,
        );
      if (move === undefined) perform(game, "end-turn");
      else {
        const result = game.perform(move);
        expect(result.ok).toBe(true);
      }
    }
    expect(game.snapshot().result).toMatchObject({
      type: "explorer-escaped",
      winnerSeatId: "human",
    });
    expect(game.snapshot().legalActions).toEqual([]);
  });

  it("reaches immutable vault collapse through complete rounds", () => {
    const game = new ShiftingVaultsGame();
    for (let step = 0; step < 20 && game.snapshot().result === null; step += 1)
      perform(game, "end-turn");
    const collapsed = game.snapshot();
    expect(collapsed.result).toMatchObject({
      type: "vault-collapse",
      winnerSeatId: null,
    });
    expect(collapsed.threat.value).toBe(10);
    expect(collapsed.legalActions).toEqual([]);
  });
});

function playUntilRefill(game: ShiftingVaultsGame): VaultSnapshot {
  let previousDrawSize = game.snapshot().deck.draw.length;
  for (let turn = 0; turn < 12; turn += 1) {
    const tactic = game
      .legalActions()
      .find((option) => option.actionId === "play-tactic-card");
    if (tactic !== undefined) expect(game.perform(tactic).ok).toBe(true);
    perform(game, "end-turn");
    const snapshot = game.snapshot();
    if (previousDrawSize === 0 && snapshot.deck.draw.length > 0)
      return snapshot;
    previousDrawSize = snapshot.deck.draw.length;
  }
  throw new Error("Deck did not refill within the deterministic turn bound");
}

function shortestRoute(
  snapshot: VaultSnapshot,
  from: string,
  targets: string[],
): string[] {
  const rooms = Object.values(snapshot.zones).map((zone) => ({
    id: zone.id,
    row: zone.row,
    column: zone.column,
    rotation: zone.rotation,
    doors: zone.doors,
  }));
  const queue: string[][] = [[from]];
  const visited = new Set([from]);
  while (queue.length > 0) {
    const route = queue.shift()!;
    const current = route.at(-1)!;
    if (targets.includes(current)) return route;
    for (const next of connectedRoomIds(current, rooms)) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push([...route, next]);
    }
  }
  return [];
}
