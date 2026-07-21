import { useCallback, useState } from "react";

import { TableCanvas } from "../render";
import { RoomRuntime, type LegalActionOption } from "../runtime";
import {
  BLUE_GATE_HERO_SOURCE,
  commitDesignerCandidate,
  createCuratedCheckpoint,
  CURATED_REPLAY,
  ShiftingVaultsGame,
  speculateDesignerCandidate,
} from "../sample";
import type { DesignerCandidate } from "../shared/ai";
import { APP_NAME, LANGUAGE_VERSION } from "../shared/versions";
import { requestDesignerCandidate, requestPlayerChoice } from "./ai-client";
import {
  resolveChosenOption,
  runDesignerRepairLoop,
} from "./designer-orchestrator";

export function App() {
  const isJudge = window.location.pathname === "/judge";
  const [game, setGame] = useState(() => createCuratedCheckpoint());
  const [, setGameRevision] = useState(0);
  const [designerPrompt, setDesignerPrompt] = useState(
    "Whenever an explorer enters a blue gate, rotate the connected room clockwise.",
  );
  const [designerBusy, setDesignerBusy] = useState(false);
  const [designerStatus, setDesignerStatus] = useState(
    "Live GPT-5.6 is optional; the labelled example uses the identical validation path.",
  );
  const [designerCells, setDesignerCells] = useState<DesignerCandidate[]>([]);
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
    setDesignerCells([]);
    setGameMessage("Reset to the immutable guided checkpoint.");
  };

  const freshCopy = () => {
    setGame(new ShiftingVaultsGame());
    setDesignerCells([]);
    setGameMessage("Created a deterministic fresh game from setup.");
  };

  const useExampleRule = () => {
    const candidate = {
      source: BLUE_GATE_HERO_SOURCE,
      summary: "Labelled example: blue gates rotate an unoccupied linked room.",
      expected_effects: [
        "Entering Azure Gate rotates Mirror Gallery clockwise.",
      ],
    };
    const speculative = speculateDesignerCandidate(game, candidate.source);
    const result = speculative.ok
      ? commitDesignerCandidate(game, candidate.source)
      : speculative;
    if (!result.ok) {
      setDesignerStatus(
        `${result.diagnostic.code}: ${result.diagnostic.message}`,
      );
      return;
    }
    setDesignerCells((cells) => [...cells, candidate]);
    setDesignerStatus(
      "Labelled example rule validated and committed as a normal Designer cell.",
    );
    setGameMessage("The example blue-gate Scenario is active and reversible.");
    setGameRevision((value) => value + 1);
  };

  const askDesigner = async () => {
    setDesignerBusy(true);
    const initialHash = game.snapshot().stateHash;
    try {
      const result = await runDesignerRepairLoop({
        baseHash: initialHash,
        currentHash: () => game.snapshot().stateHash,
        generate: async (attempt, diagnostics) => {
          setDesignerStatus(
            `GPT-5.6 attempt ${String(attempt)} of 3 · assembling bounded context…`,
          );
          return requestDesignerCandidate(
            {
              roomId: "judge-shifting-vaults",
              request: designerPrompt,
              baseSeq: CURATED_REPLAY.length + designerCells.length,
              baseHash: initialHash,
              sourceCells: [
                ...CURATED_REPLAY.map((cell) => ({
                  id: cell.id,
                  kind: "action" as const,
                  source: cell.source,
                })),
                ...designerCells.map((cell, index) => ({
                  id: `designer-${String(index + 1)}`,
                  kind: "rule" as const,
                  source: cell.source,
                })),
              ],
              inspection: inspectionFor(game),
              attempt,
              diagnostics,
            },
            (event) => {
              if (event.type === "progress")
                setDesignerStatus(`GPT-5.6 · ${event.stage}…`);
            },
          );
        },
        validate: (source) => speculateDesignerCandidate(game, source),
        commit: (source) => commitDesignerCandidate(game, source),
        onRejected: (diagnostic) => {
          setDesignerStatus(
            `Candidate rejected locally (${diagnostic.code}); requesting repair.`,
          );
        },
      });
      if (result.ok) {
        setDesignerCells((cells) => [...cells, result.candidate]);
        setDesignerStatus(
          `Live ${result.candidate.summary} Validated${result.revalidated ? " again against the changed room" : " locally"} and committed.`,
        );
        setGameMessage(
          "GPT-5.6's blue-gate Scenario is active and reversible.",
        );
        setGameRevision((value) => value + 1);
        return;
      }
      setDesignerStatus(
        result.error === undefined
          ? "Three candidates failed local validation. Nothing was committed; use the labelled example."
          : `${result.error}. The labelled fallback remains playable.`,
      );
    } finally {
      setDesignerBusy(false);
    }
  };

  const askAiPlayer = async () => {
    const offered = game.legalActions("ai");
    const optionMap = new Map(
      offered.map((option, index) => [
        `ivo-option-${String(index + 1)}`,
        option,
      ]),
    );
    setGameMessage("GPT-5.6 Luna is choosing from opaque legal option IDs…");
    try {
      const response = await requestPlayerChoice({
        roomId: "judge-shifting-vaults",
        baseHash: game.snapshot().stateHash,
        inspection: inspectionFor(game),
        options: [...optionMap].map(([optionId, option]) => ({
          optionId,
          label: option.label,
          consequence: actionConsequence(option),
        })),
      });
      const stillLegal = resolveChosenOption({
        offered: optionMap,
        chosenOptionId: response.choice.option_id,
        current: game.legalActions("ai"),
      });
      if (stillLegal === undefined) throw new Error("AI_ACTION_UNAVAILABLE");
      performOption(stillLegal);
      setGameMessage(
        `Live ${response.model}: ${response.choice.reason} · committed through performAction.`,
      );
    } catch {
      const fallback = game.chooseFallbackAction("ai");
      performOption(fallback);
      setGameMessage(
        `Labelled deterministic fallback chose ${fallback.label} after the live AI path was unavailable.`,
      );
    }
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
            {designerCells.map((cell, index) => (
              <li className="designer-cell" key={`designer-${String(index)}`}>
                <strong>Designer · {cell.summary}</strong>
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
                <div className="ai-player-actions">
                  <button
                    className="ai-turn-button"
                    type="button"
                    onClick={() => void askAiPlayer()}
                  >
                    Ask GPT-5.6 Luna for Ivo move
                  </button>
                  <button
                    className="ai-turn-button"
                    type="button"
                    onClick={() => {
                      const results = game.playFallbackTurn("ai");
                      setGameMessage(
                        `Labelled deterministic fallback completed ${String(results.length)} legal AI cells.`,
                      );
                      setGameRevision((value) => value + 1);
                    }}
                  >
                    Run Ivo fallback turn
                  </button>
                </div>
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

          <section className="designer-agent" aria-label="Designer agent">
            <h3>GPT-5.6 Designer</h3>
            <label className="source-label" htmlFor="designer-prompt">
              Prepared rule request
            </label>
            <textarea
              id="designer-prompt"
              value={designerPrompt}
              onChange={(event) => setDesignerPrompt(event.target.value)}
              maxLength={1_000}
            />
            <button
              type="button"
              disabled={designerBusy}
              onClick={() => void askDesigner()}
            >
              {designerBusy ? "Validating GPT-5.6…" : "Ask GPT-5.6 Designer"}
            </button>
            <button type="button" onClick={useExampleRule}>
              Use labelled example rule
            </button>
            <p className="designer-status" role="status">
              {designerStatus}
            </p>
          </section>

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

function actionConsequence(option: LegalActionOption): string {
  const target =
    option.parameters.destinationId ??
    option.parameters.roomId ??
    option.parameters.targetId ??
    "current turn";
  return `${option.label} affects ${target}; the browser retains and revalidates literal arguments.`;
}

function inspectionFor(game: ShiftingVaultsGame): string {
  const snapshot = game.snapshot();
  return JSON.stringify({
    round: snapshot.round,
    activeSeatId: snapshot.activeSeatId,
    threat: snapshot.threat.value,
    result: snapshot.result,
    explorers: Object.values(snapshot.explorers).map((explorer) => ({
      id: explorer.id,
      zoneId: explorer.zoneId,
      relicCount: explorer.relicCount,
      actionPoints: explorer.actionPoints,
    })),
    zones: Object.values(snapshot.zones).map((zone) => ({
      id: zone.id,
      tags: zone.tags,
      linkedRoomId: zone.linkedRoomId,
      rotation: zone.rotation,
    })),
  });
}
