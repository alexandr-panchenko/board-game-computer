import { useCallback, useState } from "react";

import { TableCanvas } from "../render";
import { RoomRuntime, type LegalActionOption } from "../runtime";
import {
  createCuratedCheckpoint,
  CURATED_REPLAY,
  ShiftingVaultsGame,
} from "../sample";
import { APP_NAME, LANGUAGE_VERSION } from "../shared/versions";

export function App() {
  const isJudge = window.location.pathname === "/judge";
  const [game, setGame] = useState(() => createCuratedCheckpoint());
  const [, setGameRevision] = useState(0);
  const [gameMessage, setGameMessage] = useState(
    "Fresh deterministic vault ready. Choose any highlighted legal action.",
  );
  const [runtime] = useState(() => new RoomRuntime());
  const [source, setSource] = useState(
    'let score = 1; trace("score-created");',
  );
  const [runtimeMessage, setRuntimeMessage] = useState(
    "Ready for a reversible source cell.",
  );
  const [runtimeTrace, setRuntimeTrace] = useState("No trace recorded yet.");
  const [, setRuntimeRevision] = useState(0);
  const snapshot = game.snapshot();
  const mara = snapshot.explorers["explorer-mara"]!;
  const ivo = snapshot.explorers["explorer-ivo"]!;

  const performOption = useCallback(
    (option: LegalActionOption) => {
      const result = game.perform(option);
      if (result.ok) {
        const labels = result.commit.transaction.forward.trace.map(
          (event) => event.label,
        );
        setGameMessage(
          `${option.label} committed as one reversible cell${labels.length > 0 ? ` · ${labels.join(" → ")}` : ""}.`,
        );
      } else {
        setGameMessage(`${result.failure.code}: ${result.failure.message}`);
      }
      setGameRevision((value) => value + 1);
    },
    [game],
  );

  const handleDrop = useCallback(
    (_entityId: string, zoneId: string) => {
      const option = game
        .legalActions("human")
        .find(
          (candidate) =>
            candidate.actionId === "move-explorer" &&
            candidate.parameters.destinationId === zoneId,
        );
      if (option === undefined) {
        setGameMessage(`No legal move to ${zoneId}.`);
        return;
      }
      performOption(option);
    },
    [game, performOption],
  );

  const runCell = () => {
    const result = runtime.executeCell(source);
    setRuntimeMessage(
      result.ok
        ? `Committed ${result.cellId}: ${String(result.forward.mutations.length)} reversible mutations.`
        : `${result.diagnostic.code}: ${result.diagnostic.message}`,
    );
    setRuntimeTrace(
      result.ok ? JSON.stringify(result.forward.trace) : "Cell rolled back.",
    );
    setRuntimeRevision((value) => value + 1);
  };

  const reset = () => {
    setGame(createCuratedCheckpoint());
    setGameMessage("Reset to the immutable guided checkpoint.");
  };

  const freshCopy = () => {
    setGame(new ShiftingVaultsGame());
    setGameMessage("Created a deterministic fresh game from setup.");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{APP_NAME}</p>
          <h1>Shifting Vaults</h1>
        </div>
        <div className="status" aria-label="Game status">
          <span>Round {snapshot.round}</span>
          <span>{seatLabel(snapshot.activeSeatId)} turn</span>
          <span>Threat {snapshot.threat.value} / 10</span>
        </div>
      </header>

      <section className="workspace" aria-label="Board game workspace">
        <aside className="panel script-panel">
          <h2>Script & Replay</h2>
          <p className="muted">{LANGUAGE_VERSION}</p>
          <p className="replay-callout">
            This table is a running program. Each action below is canonical
            source with a deterministic trace.
          </p>
          <ol className="replay-list">
            {CURATED_REPLAY.map((cell, index) => (
              <li
                className={index === 0 ? "active-cell" : undefined}
                key={cell.id}
              >
                <strong>{cell.label}</strong>
                <code>{cell.source}</code>
              </li>
            ))}
          </ol>
        </aside>

        <section className="table-panel" aria-label="Shifting Vaults tabletop">
          <p className="coachmark">
            Drag Mara to a highlighted connected room, or use the semantic
            action list.
          </p>
          <TableCanvas snapshot={snapshot} onDrop={handleDrop} />
          <p className="table-summary">
            Objective: recover 2 relics and return to Gatehouse · Mara:{" "}
            {mara.zoneId}, {mara.relicCount} relics, {mara.actionPoints} AP ·
            Ivo: {ivo.zoneId}, {ivo.relicCount} relics, {ivo.actionPoints} AP
          </p>
        </section>

        <aside className="panel inspector-panel">
          <h2>Actions & Inspector</h2>
          {snapshot.result === null ? (
            <>
              <h3>Legal actions · {seatLabel(snapshot.activeSeatId)}</h3>
              <ul className="legal-action-list" aria-label="Legal actions">
                {snapshot.legalActions.map((option) => (
                  <li key={option.id}>
                    <button type="button" onClick={() => performOption(option)}>
                      {actionLabel(option)}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="game-history-actions">
                <button
                  type="button"
                  onClick={() => {
                    setGameMessage(
                      game.runtime.undo()
                        ? "Applied the game cell inverse patch."
                        : "No game cell to undo.",
                    );
                    setGameRevision((value) => value + 1);
                  }}
                >
                  Undo game cell
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGameMessage(
                      game.runtime.redo()
                        ? "Reapplied the game cell forward patch."
                        : "No game cell to redo.",
                    );
                    setGameRevision((value) => value + 1);
                  }}
                >
                  Redo game cell
                </button>
              </div>
              {snapshot.activeSeatId === "ai" ? (
                <button
                  className="ai-turn-button"
                  type="button"
                  onClick={() => {
                    const results = game.playFallbackTurn("ai");
                    setGameMessage(
                      `Deterministic fallback completed ${String(results.length)} legal AI cells.`,
                    );
                    setGameRevision((value) => value + 1);
                  }}
                >
                  Run Ivo fallback turn
                </button>
              ) : null}
            </>
          ) : (
            <div className="game-result" role="status">
              {snapshot.result.type === "explorer-escaped"
                ? `${seatLabel(snapshot.result.winnerSeatId ?? "human")} escaped the vault!`
                : "The vault collapsed."}
            </div>
          )}
          <p className="runtime-message" role="status">
            {gameMessage}
          </p>
          <p className="hand-summary">
            Mara hand: {mara.hand.join(", ") || "empty"}
          </p>
          <dl className="runtime-state">
            <dt>Game state hash</dt>
            <dd data-testid="game-state-hash">{snapshot.stateHash}</dd>
          </dl>

          <details className="runtime-lab">
            <summary>Reversible language lab</summary>
            <label className="source-label" htmlFor="runtime-source">
              Source cell
            </label>
            <textarea
              id="runtime-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              spellCheck={false}
            />
            <div className="runtime-actions">
              <button type="button" onClick={runCell}>
                Run cell
              </button>
              <button
                type="button"
                onClick={() => {
                  setRuntimeMessage(
                    runtime.undo()
                      ? "Applied inverse patch."
                      : "Nothing to undo.",
                  );
                  setRuntimeRevision((value) => value + 1);
                }}
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => {
                  setRuntimeMessage(
                    runtime.redo()
                      ? "Applied forward patch."
                      : "Nothing to redo.",
                  );
                  setRuntimeRevision((value) => value + 1);
                }}
              >
                Redo
              </button>
            </div>
            <p className="runtime-message" role="status">
              {runtimeMessage}
            </p>
            <dl className="runtime-state">
              <dt>Language hash</dt>
              <dd data-testid="language-state-hash">{runtime.hash()}</dd>
              <dt>Bindings</dt>
              <dd>{JSON.stringify(runtime.bindings())}</dd>
              <dt>Trace</dt>
              <dd>{runtimeTrace}</dd>
            </dl>
          </details>
        </aside>
      </section>

      <footer className="actionbar">
        <span>{isJudge ? "Judge route ready" : "Demo route ready"}</span>
        <div>
          <button type="button" onClick={reset}>
            Reset
          </button>
          <button type="button" onClick={freshCopy}>
            Fresh copy
          </button>
        </div>
      </footer>
    </main>
  );
}

function seatLabel(seatId: string): string {
  return seatId === "human" ? "Mara" : seatId === "ai" ? "Ivo" : seatId;
}

function actionLabel(option: LegalActionOption): string {
  const target =
    option.parameters.destinationId ??
    option.parameters.roomId ??
    option.parameters.targetId;
  const card = option.parameters.cardId;
  return [option.label, card, target === undefined ? undefined : `→ ${target}`]
    .filter((part): part is string => part !== undefined)
    .join(" ");
}
