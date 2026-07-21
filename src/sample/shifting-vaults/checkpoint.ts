import { ShiftingVaultsGame } from "./game";

export function createCuratedCheckpoint(): ShiftingVaultsGame {
  const game = new ShiftingVaultsGame();
  perform(game, "play-tactic-card", {
    cardId: "gear-1",
    targetId: "clockwork-archive",
  });
  perform(game, "move-explorer", { destinationId: "clockwork-archive" });
  perform(game, "end-turn");
  perform(game, "move-explorer", { destinationId: "clockwork-archive" });
  perform(game, "move-explorer", { destinationId: "echo-hall" });
  perform(game, "end-turn");
  perform(game, "play-tactic-card", { cardId: "ward-2" });
  perform(game, "search-room", { roomId: "clockwork-archive" });
  perform(game, "end-turn");
  perform(game, "search-room", { roomId: "echo-hall" });
  perform(game, "end-turn");
  return game;
}

function perform(
  game: ShiftingVaultsGame,
  actionId: string,
  parameters: Record<string, string> = {},
): void {
  const option = game
    .legalActions()
    .find(
      (candidate) =>
        candidate.actionId === actionId &&
        Object.entries(parameters).every(
          ([key, value]) => candidate.parameters[key] === value,
        ),
    );
  if (option === undefined)
    throw new Error(
      `Curated checkpoint action unavailable: ${actionId} ${JSON.stringify(parameters)}`,
    );
  const result = game.perform(option);
  if (!result.ok) throw new Error(result.failure.message);
}
