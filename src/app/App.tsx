import { useCallback, useEffect, useRef, useState } from "react";

import { TableCanvas } from "../render";
import { RoomRuntime, type LegalActionOption } from "../runtime";
import {
  BLUE_GATE_HERO_SOURCE,
  commitDesignerCandidate,
  createCuratedCheckpoint,
  createGuidedReplayStep,
  CURATED_REPLAY,
  ShiftingVaultsGame,
  speculateDesignerCandidate,
  type ReplayFixtureCell,
  type VaultExplorer,
  type VaultSnapshot,
} from "../sample";
import type { DesignerCandidate } from "../shared/ai";
import { APP_NAME, LANGUAGE_VERSION } from "../shared/versions";
import { requestDesignerCandidate, requestPlayerChoice } from "./ai-client";
import {
  resolveChosenOption,
  runDesignerRepairLoop,
} from "./designer-orchestrator";
import {
  accessFromCreation,
  accessFromLocation,
  createSharedRoom,
  SharedRoomClient,
  type RoomAccess,
  type SharedRoomView,
} from "./shared-room-client";

export function App() {
  const isJudge = window.location.pathname === "/judge";
  const [game, setGame] = useState(() => createCuratedCheckpoint());
  const [journey, setJourney] = useState<JourneyStage>("replay");
  const [replayStep, setReplayStep] = useState<0 | 1 | 2 | 3>(0);
  const [replayTrace, setReplayTrace] = useState<string[]>([]);
  const [, setGameRevision] = useState(0);
  const [designerPrompt, setDesignerPrompt] = useState(
    "Whenever an explorer enters a blue gate, rotate the connected room clockwise.",
  );
  const [designerBusy, setDesignerBusy] = useState(false);
  const [designerRetry, setDesignerRetry] = useState(false);
  const designerAbortRef = useRef<AbortController | null>(null);
  const [aiPlayerBusy, setAiPlayerBusy] = useState(false);
  const aiPlayerAbortRef = useRef<AbortController | null>(null);
  const [designerStatus, setDesignerStatus] = useState(
    "Live GPT-5.6 is optional; the labelled example uses the identical validation path.",
  );
  const [designerCells, setDesignerCells] = useState<DesignerCandidate[]>([]);
  const [gameMessage, setGameMessage] = useState(
    "The guided checkpoint is ready. The board will change with each program cell.",
  );
  const [surface, setSurface] = useState<ProductSurface>("play");
  const [showHowTo, setShowHowTo] = useState(false);
  const [focusedRoomId, setFocusedRoomId] = useState<string | null>(
    "clockwork-archive",
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
  const sharedRef = useRef<SharedRoomClient | null>(null);
  const [sharedView, setSharedView] = useState<SharedRoomView | null>(null);
  const [sharingBusy, setSharingBusy] = useState(false);

  const attachSharedRoom = useCallback(
    (access: RoomAccess, playerUrl?: string) => {
      sharedRef.current?.destroy();
      const client = new SharedRoomClient(
        access,
        (nextGame, view, message) => {
          setGame(nextGame);
          setSharedView(view);
          setGameMessage(message);
          setGameRevision((value) => value + 1);
        },
        playerUrl === undefined ? {} : { playerUrl },
      );
      sharedRef.current = client;
      setSharedView(client.view());
      setJourney("shared");
      setReplayStep(3);
      setReplayTrace(CURATED_REPLAY[2]?.trace ?? []);
    },
    [],
  );

  useEffect(() => {
    const access = accessFromLocation();
    const timer =
      access === null
        ? null
        : window.setTimeout(() => attachSharedRoom(access), 0);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      sharedRef.current?.destroy();
      designerAbortRef.current?.abort();
      aiPlayerAbortRef.current?.abort();
    };
  }, [attachSharedRoom]);

  const snapshot = game.snapshot();
  const mara = snapshot.explorers["explorer-mara"]!;
  const ivo = snapshot.explorers["explorer-ivo"]!;

  const performOption = useCallback(
    (option: LegalActionOption) => {
      const before = game.snapshot();
      const shared = sharedRef.current;
      const result = shared === null ? game.perform(option) : null;
      const succeeded =
        shared === null ? result?.ok === true : shared.proposeAction(option);
      if (succeeded) {
        const targetId = actionTarget(option);
        setFocusedRoomId(targetId);
        setGameMessage(actionResultMessage(option, before));
        if (
          journey === "takeover" &&
          option.actorId === "human" &&
          option.actionId === "move-explorer" &&
          option.parameters.destinationId === "azure-gate"
        ) {
          const endTurn = game
            .legalActions("human")
            .find((candidate) => candidate.actionId === "end-turn");
          if (endTurn !== undefined) {
            if (shared === null) game.perform(endTurn);
            else shared.proposeAction(endTurn);
          }
          setJourney("human-done");
          setGameMessage(
            "Mara moved to Azure Gate through matching doors. Her guided turn is complete, so Ivo is next.",
          );
        } else if (
          journey === "rule-done" &&
          option.actorId === "human" &&
          option.actionId === "move-explorer" &&
          option.parameters.destinationId === "clockwork-archive"
        ) {
          setJourney("return-to-gate");
          setGameMessage(
            "Mara moved to Clockwork Archive. Azure Gate is now ready to be entered again.",
          );
        } else if (
          journey === "return-to-gate" &&
          option.actorId === "human" &&
          option.actionId === "move-explorer" &&
          option.parameters.destinationId === "azure-gate"
        ) {
          setJourney("triggered");
          setFocusedRoomId("mirror-gallery");
          setGameMessage(
            "The new rule fired: entering Azure Gate rotated Mirror Gallery clockwise. The game is still playable.",
          );
        }
      } else if (result?.ok === false) {
        setGameMessage(`${result.failure.code}: ${result.failure.message}`);
      } else {
        setGameMessage(
          "Shared action is paused until the room is connected and viewing live history.",
        );
      }
      setGameRevision((value) => value + 1);
    },
    [game, journey],
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
        const zone = game.snapshot().zones[zoneId];
        setGameMessage(
          `That route to ${zone?.label ?? "the selected room"} is closed. Choose a glowing destination.`,
        );
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

  const leaveSharedRoom = () => {
    if (sharedRef.current === null) return;
    sharedRef.current.destroy();
    sharedRef.current = null;
    setSharedView(null);
    history.replaceState(null, "", "/judge");
  };

  const reset = () => {
    leaveSharedRoom();
    setGame(createCuratedCheckpoint());
    setDesignerCells([]);
    setJourney("takeover");
    setSurface("play");
    setReplayStep(3);
    setReplayTrace(CURATED_REPLAY[2]?.trace ?? []);
    setGameMessage("Returned to the immutable demo checkpoint.");
    setFocusedRoomId("clockwork-archive");
  };

  const freshCopy = () => {
    leaveSharedRoom();
    setGame(new ShiftingVaultsGame());
    setDesignerCells([]);
    setJourney("free-play");
    setSurface("play");
    setReplayStep(0);
    setReplayTrace([]);
    setGameMessage(
      "A fresh vault is ready. Mara has 2 AP; move through a matching doorway or rotate a neighboring room.",
    );
    setFocusedRoomId("gatehouse");
  };

  const replayFromStart = () => {
    leaveSharedRoom();
    setGame(createGuidedReplayStep(0));
    setDesignerCells([]);
    setJourney("replay");
    setSurface("play");
    setReplayStep(0);
    setReplayTrace([]);
    setGameMessage("Replay reset to the immutable pre-step state.");
    setFocusedRoomId(null);
  };

  const nextReplayStep = () => {
    const next = Math.min(3, replayStep + 1) as 1 | 2 | 3;
    setGame(createGuidedReplayStep(next));
    setReplayStep(next);
    setReplayTrace(CURATED_REPLAY[next - 1]?.trace ?? []);
    setFocusedRoomId(replayFocus(next));
    setGameMessage(
      next === 3
        ? "Replay complete. The exact takeover checkpoint is ready."
        : `Replay step ${String(next)} applied from canonical source.`,
    );
  };

  const takeControl = () => {
    setGame(createCuratedCheckpoint());
    setJourney("takeover");
    setSurface("play");
    setReplayStep(3);
    setReplayTrace(CURATED_REPLAY[2]?.trace ?? []);
    setGameMessage(
      "Takeover is live. Move Mara to the highlighted Azure Gate.",
    );
    setFocusedRoomId("azure-gate");
  };

  const startSharedRoom = async () => {
    setSharingBusy(true);
    try {
      const checkpoint = createCuratedCheckpoint();
      const creation = await createSharedRoom(checkpoint.snapshot().stateHash);
      setGame(checkpoint);
      setDesignerCells([]);
      attachSharedRoom(accessFromCreation(creation), creation.playerUrl);
      setGameMessage(
        "Persistent room created. Share the Player link; capability secrets remain in URL fragments.",
      );
    } catch (error) {
      setGameMessage(
        error instanceof Error
          ? error.message
          : "Could not create shared room.",
      );
    } finally {
      setSharingBusy(false);
    }
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
      ? sharedRef.current === null
        ? commitDesignerCandidate(game, candidate.source)
        : sharedRef.current.proposeDesigner(candidate.source)
          ? ({ ok: true } as const)
          : ({
              ok: false,
              diagnostic: {
                code: "TS_ROOM_NOT_READY",
                phase: "conflict" as const,
                message: "Shared room is not ready for a Designer proposal.",
              },
            } as const)
      : speculative;
    if (!result.ok) {
      setDesignerStatus(
        `${result.diagnostic.code}: ${result.diagnostic.message}`,
      );
      return;
    }
    setDesignerCells((cells) => [...cells, candidate]);
    setJourney("rule-done");
    setSurface("play");
    setDesignerStatus(
      "Labelled example rule validated and committed as a normal Designer cell.",
    );
    setGameMessage(
      "The example rule passed local validation and is active. Move Mara away, then back through Azure Gate to trigger it.",
    );
    setGameRevision((value) => value + 1);
  };

  const askDesigner = async () => {
    const controller = new AbortController();
    designerAbortRef.current?.abort();
    designerAbortRef.current = controller;
    setDesignerBusy(true);
    setDesignerRetry(false);
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
            controller.signal,
          );
        },
        validate: (source) => speculateDesignerCandidate(game, source),
        commit: (source) =>
          sharedRef.current === null
            ? commitDesignerCandidate(game, source)
            : sharedRef.current.proposeDesigner(source)
              ? { ok: true }
              : {
                  ok: false,
                  diagnostic: {
                    code: "TS_ROOM_NOT_READY",
                    phase: "conflict",
                    message:
                      "Shared room is not ready for a Designer proposal.",
                  },
                },
        onRejected: (diagnostic) => {
          setDesignerStatus(
            `Candidate rejected locally (${diagnostic.code}); requesting repair.`,
          );
        },
      });
      if (result.ok) {
        setDesignerCells((cells) => [...cells, result.candidate]);
        setJourney("rule-done");
        setSurface("play");
        setDesignerStatus(
          `Live ${result.candidate.summary} Validated${result.revalidated ? " again against the changed room" : " locally"} and committed.`,
        );
        setGameMessage(
          "GPT-5.6's blue-gate Scenario is active and reversible.",
        );
        setGameRevision((value) => value + 1);
        return;
      }
      if (controller.signal.aborted) {
        setDesignerRetry(true);
        setDesignerStatus(
          "Designer request cancelled. Nothing was committed; retry or use the labelled example.",
        );
        return;
      }
      setDesignerRetry(true);
      setDesignerStatus(
        result.error === undefined
          ? "Three candidates failed local validation. Nothing was committed; use the labelled example."
          : `${result.error}. The labelled fallback remains playable.`,
      );
    } finally {
      if (designerAbortRef.current === controller) {
        designerAbortRef.current = null;
        setDesignerBusy(false);
      }
    }
  };

  const askAiPlayer = async () => {
    const controller = new AbortController();
    aiPlayerAbortRef.current?.abort();
    aiPlayerAbortRef.current = controller;
    setAiPlayerBusy(true);
    const offered = game.legalActions("ai");
    const optionMap = new Map(
      offered.map((option, index) => [
        `ivo-option-${String(index + 1)}`,
        option,
      ]),
    );
    setGameMessage("GPT-5.6 Luna is choosing from opaque legal option IDs…");
    try {
      const response = await requestPlayerChoice(
        {
          roomId: "judge-shifting-vaults",
          baseHash: game.snapshot().stateHash,
          inspection: inspectionFor(game),
          options: [...optionMap].map(([optionId, option]) => ({
            optionId,
            label: option.label,
            consequence: actionConsequence(option),
          })),
        },
        controller.signal,
      );
      const stillLegal = resolveChosenOption({
        offered: optionMap,
        chosenOptionId: response.choice.option_id,
        current: game.legalActions("ai"),
      });
      if (stillLegal === undefined) throw new Error("AI_ACTION_UNAVAILABLE");
      performOption(stillLegal);
      finishSeatTurn(game, "ai", performOption);
      if (journey === "human-done") {
        setJourney("ai-done");
        setSurface("rules");
      }
      setGameMessage(
        `Live ${response.model}: ${response.choice.reason} · committed through performAction.`,
      );
    } catch {
      if (controller.signal.aborted) {
        setGameMessage(
          "Luna request cancelled. Ivo remains ready; retry or use the labelled fallback.",
        );
        return;
      }
      const fallback = game.chooseFallbackAction("ai");
      performOption(fallback);
      finishSeatTurn(game, "ai", performOption);
      if (journey === "human-done") {
        setJourney("ai-done");
        setSurface("rules");
      }
      setGameMessage(
        `Labelled deterministic fallback chose ${fallback.label} after the live AI path was unavailable.`,
      );
    } finally {
      if (aiPlayerAbortRef.current === controller) {
        aiPlayerAbortRef.current = null;
        setAiPlayerBusy(false);
      }
    }
  };

  const runAiFallback = () => {
    const results = [];
    for (
      let step = 0;
      step < 12 && game.snapshot().activeSeatId === "ai";
      step += 1
    ) {
      const option = game.chooseFallbackAction("ai");
      if (sharedRef.current === null) {
        results.push(game.perform(option));
      } else {
        const before = game.snapshot().stateHash;
        performOption(option);
        results.push({ ok: game.snapshot().stateHash !== before });
      }
      if (option.actionId === "end-turn") break;
    }
    if (journey === "human-done") {
      setJourney("ai-done");
      setSurface("rules");
    }
    setGameMessage(
      `Ivo's deterministic fallback completed ${String(results.length)} legal actions. The same rule-changing step is ready.`,
    );
    setGameRevision((value) => value + 1);
  };

  const coach = coachFor(journey, replayStep);
  const recommended = snapshot.legalActions.find((option) =>
    isRecommended(journey, option),
  );
  const freePlayPrimary = preferredFreePlayAction(snapshot.legalActions);
  const primaryAction = (() => {
    if (journey === "replay")
      return replayStep < 3
        ? {
            label: "Next step",
            hint: "Run the next reversible cell",
            onClick: nextReplayStep,
            disabled: false,
          }
        : {
            label: "Take control",
            hint: "Mara is ready for you",
            onClick: takeControl,
            disabled: false,
          };
    if (journey === "takeover" && recommended !== undefined)
      return {
        ...optionPrimary(recommended, snapshot),
        onClick: () => performOption(recommended),
      };
    if (journey === "human-done")
      return {
        label: aiPlayerBusy ? "Ivo is choosing…" : "Let Ivo move",
        hint: "Powered by GPT-5.6 Luna",
        onClick: () => void askAiPlayer(),
        disabled: aiPlayerBusy,
      };
    if (snapshot.activeSeatId === "ai")
      return {
        label: aiPlayerBusy ? "Ivo is choosing…" : "Let Ivo move",
        hint: "Powered by GPT-5.6 Luna",
        onClick: () => void askAiPlayer(),
        disabled: aiPlayerBusy,
      };
    if (journey === "ai-done")
      return {
        label: designerBusy ? "Validating the rule…" : "Change the rules",
        hint: "GPT-5.6 proposes; the runtime validates",
        onClick: () => void askDesigner(),
        disabled: designerBusy || sharedView?.role === "player",
      };
    if (
      (journey === "rule-done" || journey === "return-to-gate") &&
      recommended !== undefined
    )
      return {
        ...optionPrimary(recommended, snapshot),
        onClick: () => performOption(recommended),
      };
    if (journey === "triggered")
      return {
        label: "Keep playing",
        hint: "The new rule remains active",
        onClick: () => setJourney("free-play"),
        disabled: false,
      };
    if (freePlayPrimary !== undefined)
      return {
        ...optionPrimary(freePlayPrimary, snapshot),
        onClick: () => performOption(freePlayPrimary),
      };
    return {
      label: "Start a fresh game",
      hint: "Return to the deterministic setup",
      onClick: freshCopy,
      disabled: false,
    };
  })();

  const currentCell = currentProgramCell(replayStep, designerCells);
  const secondaryActions = snapshot.legalActions
    .filter((option) => option.id !== recommended?.id)
    .slice(0, 2);

  return (
    <main className="app-shell">
      <header className="product-hero">
        <div className="brand-lockup">
          <p className="eyebrow">{APP_NAME}</p>
          <h1>A board game that rewrites itself.</h1>
          <p className="product-explainer">
            Play a complete tabletop game, then let AI propose a rule that the
            game validates, commits, and can undo.
          </p>
        </div>
        <div className="hero-actions">
          <span className="route-badge">
            {isJudge ? "Guided demo" : "Playable demo"}
          </span>
          <button type="button" onClick={freshCopy}>
            New game
          </button>
          <button type="button" onClick={() => setShowHowTo(true)}>
            How to play
          </button>
        </div>
      </header>

      <section className="game-heading" aria-labelledby="game-title">
        <div>
          <p className="eyebrow">The shifting-room adventure</p>
          <h2 id="game-title">Shifting Vaults</h2>
          <p className="objective">
            Find 2 relics and return to Gatehouse before Threat reaches 10.
          </p>
        </div>
        <GameHud snapshot={snapshot} mara={mara} ivo={ivo} />
      </section>

      <StageProgress journey={journey} replayStep={replayStep} />

      <nav className="surface-tabs" aria-label="Product sections">
        {(["play", "rules", "program"] as const).map((name) => (
          <button
            aria-current={surface === name ? "page" : undefined}
            className={surface === name ? "active" : undefined}
            key={name}
            type="button"
            onClick={() => setSurface(name)}
          >
            {surfaceLabel(name)}
          </button>
        ))}
      </nav>

      <span
        className="diagnostic-probe"
        data-testid="game-state-hash"
        aria-hidden="true"
      >
        {snapshot.stateHash}
      </span>

      {surface === "play" ? (
        <section className="play-surface" aria-label="Play">
          <section
            className="table-panel"
            aria-label="Shifting Vaults tabletop"
          >
            <div className="table-instruction">
              <span className="instruction-icon" aria-hidden="true">
                ✦
              </span>
              <span>{coach.instruction}</span>
            </div>
            <TableCanvas
              snapshot={snapshot}
              onDrop={handleDrop}
              focusedRoomId={focusedRoomId}
            />
            <div className="piece-legend" aria-label="Explorer positions">
              <span>
                <i className="piece-mark mara-mark">M</i> Mara ·{" "}
                {roomName(snapshot, mara.zoneId)} · {mara.actionPoints} AP ·{" "}
                {mara.relicCount}/2 relics
              </span>
              <span>
                <i className="piece-mark ivo-mark">I</i> Ivo ·{" "}
                {roomName(snapshot, ivo.zoneId)} · {ivo.actionPoints} AP ·{" "}
                {ivo.relicCount}/2 relics
              </span>
            </div>
          </section>

          <aside className="play-coach">
            <section className="journey-coach" aria-label="Current guided step">
              <p className="eyebrow">{coach.kicker}</p>
              <h3>{coach.title}</h3>
              <p>{coach.detail}</p>
              <div className="trust-badges" aria-label="Technical safeguards">
                <span>Reversible cell</span>
                <span>Validated before commit</span>
              </div>
            </section>

            <section className="outcome-card" aria-label="Latest table change">
              <p className="eyebrow">What just happened</p>
              <p className="runtime-message" role="status">
                {gameMessage}
              </p>
              <dl>
                <div>
                  <dt>Why it was legal</dt>
                  <dd>{legalReason(journey, snapshot)}</dd>
                </div>
                <div>
                  <dt>What changed</dt>
                  <dd>{changeSummary(journey, focusedRoomId, snapshot)}</dd>
                </div>
              </dl>
            </section>

            {snapshot.result === null ? (
              <>
                {snapshot.activeSeatId === "ai" ? (
                  <div className="secondary-stack">
                    {aiPlayerBusy ? (
                      <button
                        type="button"
                        onClick={() => aiPlayerAbortRef.current?.abort()}
                      >
                        Cancel Luna request
                      </button>
                    ) : null}
                    <button type="button" onClick={runAiFallback}>
                      Use deterministic Ivo fallback
                    </button>
                  </div>
                ) : null}
                {journey === "replay" && replayStep < 3 ? (
                  <button
                    className="quiet-action"
                    type="button"
                    onClick={takeControl}
                  >
                    Skip replay and take control
                  </button>
                ) : null}
                {journey !== "replay" &&
                journey !== "human-done" &&
                secondaryActions.length > 0 ? (
                  <div
                    className="quick-actions"
                    aria-label="Other useful actions"
                  >
                    {secondaryActions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => performOption(option)}
                      >
                        {actionLabel(option, snapshot)}
                      </button>
                    ))}
                  </div>
                ) : null}
                <details className="all-actions">
                  <summary>
                    All legal moves ({snapshot.legalActions.length})
                  </summary>
                  <ul className="legal-action-list" aria-label="Legal actions">
                    {snapshot.legalActions.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => performOption(option)}
                        >
                          {actionLabel(option, snapshot)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ) : (
              <div className="game-result" role="status">
                {snapshot.result.type === "explorer-escaped"
                  ? `${seatLabel(snapshot.result.winnerSeatId ?? "human")} escaped the vault!`
                  : "The vault collapsed."}
              </div>
            )}

            <HandCards snapshot={snapshot} cardIds={mara.hand} />
            <ProgramPeek
              cell={currentCell}
              trace={replayTrace}
              onOpen={() => setSurface("program")}
            />
          </aside>
        </section>
      ) : null}

      {surface === "rules" ? (
        <section
          className="single-surface rules-surface"
          aria-label="Change rules"
        >
          <div className="surface-intro">
            <p className="eyebrow">GPT-5.6 Designer</p>
            <h2>Describe one change. The game proves it is safe first.</h2>
            <p>
              GPT-5.6 returns restricted source. Your browser parses it,
              validates its capabilities, runs it speculatively, rolls it back
              exactly, and only then commits it as a reversible cell.
            </p>
            <div className="trust-badges">
              <span>Server-side API key</span>
              <span>Validated locally</span>
              <span>Atomic commit</span>
            </div>
          </div>
          <section className="designer-agent" aria-label="Designer agent">
            <label className="source-label" htmlFor="designer-prompt">
              Rule request
            </label>
            <textarea
              id="designer-prompt"
              value={designerPrompt}
              onChange={(event) => setDesignerPrompt(event.target.value)}
              maxLength={1_000}
            />
            {journey === "ai-done" ? (
              <p className="primary-pointer">
                The primary action below sends this request.
              </p>
            ) : (
              <button
                className="designer-submit"
                type="button"
                disabled={designerBusy || sharedView?.role === "player"}
                onClick={() => void askDesigner()}
              >
                {designerBusy
                  ? "Validating the rule…"
                  : designerRetry
                    ? "Retry GPT-5.6 Designer"
                    : "Ask GPT-5.6 Designer"}
              </button>
            )}
            {designerBusy ? (
              <button
                type="button"
                onClick={() => designerAbortRef.current?.abort()}
              >
                Cancel Designer request
              </button>
            ) : null}
            <button
              type="button"
              disabled={sharedView?.role === "player"}
              onClick={useExampleRule}
            >
              Try the example rule
            </button>
            <p className="designer-status" role="status">
              {designerStatus}
            </p>
          </section>

          <details className="room-sharing" aria-label="Persistent shared room">
            <summary>Share this room</summary>
            {sharedView === null ? (
              <div className="details-body">
                <p>
                  Create separate Designer and Player capability links from this
                  checkpoint.
                </p>
                <button
                  type="button"
                  disabled={sharingBusy}
                  onClick={() => void startSharedRoom()}
                >
                  {sharingBusy ? "Creating shared room…" : "Create shared room"}
                </button>
              </div>
            ) : (
              <div className="details-body">
                <p className="room-connection" role="status">
                  {sharedView.connection} · {sharedView.role} · seq{" "}
                  {sharedView.confirmedSeq}
                  {sharedView.pendingCount > 0
                    ? ` · ${String(sharedView.pendingCount)} pending`
                    : " · converged"}
                </p>
                <p>
                  Timeline {sharedView.timelineCursor} /{" "}
                  {sharedView.timelineLength}
                  {sharedView.live ? " · live" : " · inspecting prefix"}
                </p>
                {sharedView.playerUrl === undefined ? null : (
                  <a
                    href={sharedView.playerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Player link
                  </a>
                )}
                <div className="room-timeline-actions">
                  <button
                    type="button"
                    disabled={
                      sharedView.pendingCount > 0 ||
                      sharedView.timelineCursor === 0
                    }
                    onClick={() => sharedRef.current?.previous()}
                  >
                    Previous cell
                  </button>
                  <button
                    type="button"
                    disabled={sharedView.pendingCount > 0 || sharedView.live}
                    onClick={() => sharedRef.current?.next()}
                  >
                    Next cell
                  </button>
                  <button
                    type="button"
                    disabled={sharedView.pendingCount > 0 || sharedView.live}
                    onClick={() => sharedRef.current?.returnLive()}
                  >
                    Return live
                  </button>
                  <button
                    type="button"
                    disabled={sharedView.pendingCount > 0}
                    onClick={() => void sharedRef.current?.forkFromHere()}
                  >
                    Fork from here
                  </button>
                </div>
                {sharedView.forkUrl === undefined ? null : (
                  <a href={sharedView.forkUrl}>Open forked room</a>
                )}
              </div>
            )}
          </details>
        </section>
      ) : null}

      {surface === "program" ? (
        <section
          className="single-surface program-surface"
          aria-label="Program and replay"
        >
          <div className="surface-intro">
            <p className="eyebrow">The game is the program</p>
            <h2>Every move is source, state change, and an inverse patch.</h2>
            <p>
              {LANGUAGE_VERSION} interprets a deliberate JavaScript subset—never
              native eval.
            </p>
          </div>
          <ProgramCell cell={currentCell} trace={replayTrace} featured />
          <details className="full-program">
            <summary>Expand the full room program</summary>
            <ol className="replay-list">
              {CURATED_REPLAY.map((cell) => (
                <li key={cell.id}>
                  <ProgramCell cell={cell} trace={cell.trace} />
                </li>
              ))}
              {designerCells.map((cell, index) => (
                <li className="designer-cell" key={`designer-${String(index)}`}>
                  <strong>Designer · {cell.summary}</strong>
                  <code>{cell.source}</code>
                </li>
              ))}
            </ol>
          </details>

          <details className="advanced-panel">
            <summary>Advanced diagnostics</summary>
            <div className="advanced-grid">
              <section>
                <h3>Game history</h3>
                <div className="game-history-actions">
                  <button
                    type="button"
                    disabled={sharedView !== null}
                    onClick={() => {
                      setGameMessage(
                        game.runtime.undo()
                          ? "Undid the last game action."
                          : "No game action to undo.",
                      );
                      setGameRevision((value) => value + 1);
                    }}
                  >
                    Undo last move
                  </button>
                  <button
                    type="button"
                    disabled={sharedView !== null}
                    onClick={() => {
                      setGameMessage(
                        game.runtime.redo()
                          ? "Reapplied the last game action."
                          : "No game action to redo.",
                      );
                      setGameRevision((value) => value + 1);
                    }}
                  >
                    Redo last move
                  </button>
                </div>
                <dl className="runtime-state">
                  <dt>Game state hash</dt>
                  <dd>{snapshot.stateHash}</dd>
                  <dt>Route</dt>
                  <dd>{isJudge ? "Judge" : "Demo"}</dd>
                </dl>
              </section>
              <section className="runtime-lab">
                <h3>Reversible language lab</h3>
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
                    Undo lab cell
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
                    Redo lab cell
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
              </section>
            </div>
          </details>
        </section>
      ) : null}

      <div className="reset-strip" aria-label="Demo controls">
        <button type="button" onClick={reset}>
          Return to demo checkpoint
        </button>
        <button type="button" onClick={replayFromStart}>
          Replay from start
        </button>
      </div>

      <footer className="actionbar">
        <span className="action-hint">{primaryAction.hint}</span>
        <button
          className="primary-journey-action"
          data-testid="primary-journey-action"
          type="button"
          disabled={primaryAction.disabled}
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
          <span aria-hidden="true"> →</span>
        </button>
      </footer>

      {showHowTo ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}
    </main>
  );
}

type ProductSurface = "play" | "rules" | "program";

type JourneyStage =
  | "replay"
  | "takeover"
  | "human-done"
  | "ai-done"
  | "rule-done"
  | "return-to-gate"
  | "triggered"
  | "shared"
  | "free-play";

interface ProgramDisplayCell {
  label: string;
  source: string;
  trace: string[];
}

function GameHud({
  snapshot,
  mara,
  ivo,
}: {
  snapshot: VaultSnapshot;
  mara: VaultExplorer;
  ivo: VaultExplorer;
}) {
  const active = snapshot.activeSeatId === "human" ? mara : ivo;
  return (
    <div className="game-hud" aria-label="Game status">
      <div className="hud-stat active-player">
        <span className="hud-label">Active player</span>
        <strong>{seatLabel(snapshot.activeSeatId)}</strong>
        <span>Round {snapshot.round}</span>
      </div>
      <div className="hud-stat ap-stat">
        <span className="hud-label">Action points</span>
        <strong aria-label={`${String(active.actionPoints)} action points`}>
          {Array.from({ length: 2 }, (_, index) => (
            <i
              className={index < active.actionPoints ? "filled" : undefined}
              key={index}
            />
          ))}
        </strong>
        <span>{active.actionPoints} of 2</span>
      </div>
      <div className="hud-stat relic-stat">
        <span className="hud-label">Relics</span>
        <strong>◆ {active.relicCount} / 2</strong>
        <span>for {seatLabel(snapshot.activeSeatId)}</span>
      </div>
      <div className="hud-stat threat-stat">
        <span className="hud-label">Threat</span>
        <strong>{snapshot.threat.value} / 10</strong>
        <span className="threat-meter">
          <i style={{ width: `${String(snapshot.threat.value * 10)}%` }} />
        </span>
      </div>
    </div>
  );
}

const journeyLabels = [
  "Watch the program run",
  "Take control",
  "Let Ivo move",
  "Change the rules",
  "Trigger the new rule",
  "Keep playing",
] as const;

function StageProgress({
  journey,
  replayStep,
}: {
  journey: JourneyStage;
  replayStep: number;
}) {
  const active = journeyIndex(journey);
  return (
    <section className="stage-progress" aria-label="Guided demo progress">
      <div className="progress-heading">
        <span>Guided demo</span>
        <strong>
          {journey === "replay"
            ? `${String(replayStep)} of 3 program cells`
            : `Step ${String(active + 1)} of 6`}
        </strong>
      </div>
      <ol>
        {journeyLabels.map((label, index) => (
          <li
            className={
              index === active
                ? "active"
                : index < active
                  ? "complete"
                  : undefined
            }
            key={label}
            aria-current={index === active ? "step" : undefined}
          >
            <span>{index < active ? "✓" : String(index + 1)}</span>
            {label}
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProgramPeek({
  cell,
  trace,
  onOpen,
}: {
  cell: ProgramDisplayCell;
  trace: string[];
  onOpen: () => void;
}) {
  return (
    <section className="program-peek" aria-label="Current program cell">
      <div>
        <p className="eyebrow">Current program cell</p>
        <strong>{cell.label}</strong>
      </div>
      <ol className="trace-list" aria-label="Replay execution trace">
        {(trace.length > 0 ? trace : cell.trace).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <button type="button" onClick={onOpen}>
        Open Program
      </button>
    </section>
  );
}

function ProgramCell({
  cell,
  trace,
  featured = false,
}: {
  cell: ProgramDisplayCell | ReplayFixtureCell;
  trace: string[];
  featured?: boolean;
}) {
  return (
    <article className={featured ? "program-cell featured" : "program-cell"}>
      <p className="cell-badge">Reversible cell</p>
      <h3>{cell.label}</h3>
      <code>{cell.source}</code>
      <div className="cell-arrow" aria-hidden="true">
        ↓ deterministic trace
      </div>
      <ol
        className="trace-list"
        aria-label={featured ? "Replay execution trace" : undefined}
      >
        {(trace.length > 0 ? trace : "trace" in cell ? cell.trace : []).map(
          (item) => (
            <li key={item}>{item}</li>
          ),
        )}
      </ol>
    </article>
  );
}

function HandCards({
  snapshot,
  cardIds,
}: {
  snapshot: VaultSnapshot;
  cardIds: string[];
}) {
  return (
    <section className="hand-cards" aria-label="Mara tactic cards">
      <div>
        <p className="eyebrow">Mara's tactic cards</p>
        <span>Play one per turn</span>
      </div>
      <div className="card-row">
        {cardIds.length === 0 ? (
          <span className="empty-hand">No cards in hand</span>
        ) : (
          cardIds.map((id) => {
            const card = snapshot.cards[id];
            return (
              <span
                className={`tactic-card ${card?.kind ?? "unknown"}`}
                key={id}
              >
                <i aria-hidden="true">{cardIcon(card?.kind)}</i>
                <strong>{card?.label ?? "Tactic"}</strong>
                <small>{cardEffect(card?.kind)}</small>
              </span>
            );
          })
        )}
      </div>
    </section>
  );
}

function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="how-to-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-title"
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Close how to play"
          onClick={onClose}
        >
          ×
        </button>
        <p className="eyebrow">Shifting Vaults</p>
        <h2 id="how-to-title">How to play</h2>
        <p className="how-to-objective">
          Find 2 relics and return to Gatehouse before Threat reaches 10.
        </p>
        <div className="rules-grid">
          <article>
            <span>①</span>
            <h3>Spend 2 AP</h3>
            <p>
              Each explorer gets 2 action points. Moving, rotating, and
              searching cost 1 AP.
            </p>
          </article>
          <article>
            <span>↔</span>
            <h3>Match doors</h3>
            <p>
              You can move only where two room doors face each other. Rotate an
              empty neighbor to open a route.
            </p>
          </article>
          <article>
            <span>?</span>
            <h3>Search rooms</h3>
            <p>
              Hidden tokens are either relics or hazards. Relics help you
              escape; hazards raise Threat.
            </p>
          </article>
          <article>
            <span>✦</span>
            <h3>Use one tactic</h3>
            <p>
              Sprint moves, Gear rotates, Survey reveals a token, and Ward
              lowers Threat.
            </p>
          </article>
          <article>
            <span>↻</span>
            <h3>End the turn</h3>
            <p>
              Mara passes to Ivo. After Ivo, the round advances and Threat rises
              by 1.
            </p>
          </article>
          <article>
            <span>◆</span>
            <h3>Reach an ending</h3>
            <p>
              Return one explorer with 2 relics to win. At Threat 10, the vault
              collapses.
            </p>
          </article>
        </div>
        <button className="modal-done" type="button" onClick={onClose}>
          Got it—show me the vault
        </button>
      </section>
    </div>
  );
}

function seatLabel(seatId: string): string {
  return seatId === "human" ? "Mara" : seatId === "ai" ? "Ivo" : seatId;
}

function actionLabel(
  option: LegalActionOption,
  snapshot: VaultSnapshot,
): string {
  const actor = seatLabel(option.actorId);
  const targetId = actionTarget(option);
  const target = targetId === null ? null : roomName(snapshot, targetId);
  if (option.actionId === "move-explorer")
    return `Move ${actor} to ${target ?? "the next room"}`;
  if (option.actionId === "rotate-adjacent-room")
    return `Rotate ${target ?? "a nearby room"} clockwise`;
  if (option.actionId === "search-room")
    return `Search ${target ?? "this room"}`;
  if (option.actionId === "end-turn") return `End ${actor}'s turn`;
  if (option.actionId === "play-tactic-card") {
    const card = snapshot.cards[option.parameters.cardId ?? ""];
    const label = card?.label ?? "Tactic";
    if (card?.kind === "sprint")
      return `Play ${label} · Move to ${target ?? "a connected room"}`;
    if (card?.kind === "gear")
      return `Play ${label} · Rotate ${target ?? "a nearby room"}`;
    if (card?.kind === "survey")
      return `Play ${label} · Reveal ${target ?? "a nearby token"}`;
    if (card?.kind === "ward") return `Play ${label} · Lower Threat`;
    return `Play ${label}`;
  }
  return option.label;
}

function actionConsequence(option: LegalActionOption): string {
  return `${option.label} changes only the offered target; the browser retains and revalidates the literal arguments.`;
}

function actionTarget(option: LegalActionOption): string | null {
  return (
    option.parameters.destinationId ??
    option.parameters.roomId ??
    option.parameters.targetId ??
    null
  );
}

function actionResultMessage(
  option: LegalActionOption,
  snapshot: VaultSnapshot,
): string {
  const label = actionLabel(option, snapshot);
  if (option.actionId === "move-explorer")
    return `${label}. The move used 1 AP because the two room doors matched.`;
  if (option.actionId === "search-room")
    return `${label}. The hidden token was resolved and the board counters updated.`;
  if (option.actionId === "rotate-adjacent-room")
    return `${label}. Its doors now face new neighbors.`;
  if (option.actionId === "play-tactic-card")
    return `${label}. The once-per-turn card moved to the discard pile.`;
  return `${label}. The next explorer is now active.`;
}

function roomName(snapshot: VaultSnapshot, id: string): string {
  return (
    snapshot.zones[id]?.label ??
    id
      .split("-")
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function surfaceLabel(surface: ProductSurface): string {
  return surface === "play"
    ? "Play"
    : surface === "rules"
      ? "Change rules"
      : "Program";
}

function journeyIndex(journey: JourneyStage): number {
  if (journey === "replay") return 0;
  if (journey === "takeover") return 1;
  if (journey === "human-done") return 2;
  if (journey === "ai-done") return 3;
  if (journey === "rule-done" || journey === "return-to-gate") return 4;
  return 5;
}

function optionPrimary(option: LegalActionOption, snapshot: VaultSnapshot) {
  return {
    label: actionLabel(option, snapshot),
    hint:
      option.actionId === "move-explorer"
        ? "Matching doors make this move legal"
        : "Recommended legal action",
    disabled: false,
  };
}

function preferredFreePlayAction(
  options: LegalActionOption[],
): LegalActionOption | undefined {
  return (
    options.find((option) => option.actionId === "search-room") ??
    options.find((option) => option.actionId === "move-explorer") ??
    options.find((option) => option.actionId === "rotate-adjacent-room") ??
    options.find((option) => option.actionId === "play-tactic-card") ??
    options.find((option) => option.actionId === "end-turn")
  );
}

function replayFocus(step: number): string | null {
  if (step === 1) return "clockwork-archive";
  if (step === 2) return "clockwork-archive";
  if (step === 3) return "echo-hall";
  return null;
}

function currentProgramCell(
  replayStep: number,
  designerCells: DesignerCandidate[],
): ProgramDisplayCell {
  const designer = designerCells.at(-1);
  if (designer !== undefined)
    return {
      label: `Designer rule · ${designer.summary}`,
      source: designer.source,
      trace: designer.expected_effects,
    };
  const cell =
    CURATED_REPLAY[
      Math.max(0, Math.min(2, replayStep === 0 ? 0 : replayStep - 1))
    ]!;
  return {
    label: replayStep === 0 ? `Up next · ${cell.label}` : cell.label,
    source: cell.source,
    trace: cell.trace,
  };
}

function cardIcon(kind: string | undefined): string {
  if (kind === "sprint") return "➜";
  if (kind === "gear") return "⚙";
  if (kind === "survey") return "◉";
  return "◇";
}

function cardEffect(kind: string | undefined): string {
  if (kind === "sprint") return "Move free";
  if (kind === "gear") return "Rotate room";
  if (kind === "survey") return "Reveal token";
  return "Threat −1";
}

function legalReason(journey: JourneyStage, snapshot: VaultSnapshot): string {
  if (journey === "replay")
    return "The replay uses frozen, already-validated source cells.";
  if (journey === "human-done")
    return "Ivo can select only from legal options offered by the runtime.";
  if (journey === "ai-done")
    return "The proposed rule must parse, validate, execute, and roll back exactly.";
  if (journey === "rule-done" || journey === "return-to-gate")
    return "Mara has AP and the facing doors form a connected route.";
  if (journey === "triggered")
    return "The Scenario matched Mara entering a blue gate while its linked room was empty.";
  return `${seatLabel(snapshot.activeSeatId)} can use only actions currently offered by the game runtime.`;
}

function changeSummary(
  journey: JourneyStage,
  focusId: string | null,
  snapshot: VaultSnapshot,
): string {
  if (journey === "triggered")
    return "Mirror Gallery rotated 90°; its door connections changed.";
  if (focusId !== null)
    return `${roomName(snapshot, focusId)} is highlighted on the table.`;
  return "No cell has run yet. The next step will update source, trace, and table together.";
}

function finishSeatTurn(
  game: ShiftingVaultsGame,
  seatId: string,
  perform: (option: LegalActionOption) => void = (option) => {
    game.perform(option);
  },
): void {
  if (game.snapshot().activeSeatId !== seatId) return;
  const endTurn = game
    .legalActions(seatId)
    .find((option) => option.actionId === "end-turn");
  if (endTurn !== undefined) perform(endTurn);
}

function isRecommended(
  journey: JourneyStage,
  option: LegalActionOption,
): boolean {
  if (option.actionId !== "move-explorer") return false;
  const destination = option.parameters.destinationId;
  return (
    (journey === "takeover" && destination === "azure-gate") ||
    (journey === "rule-done" && destination === "clockwork-archive") ||
    (journey === "return-to-gate" && destination === "azure-gate")
  );
}

function coachFor(journey: JourneyStage, replayStep: number) {
  switch (journey) {
    case "replay":
      return {
        kicker: `Watch the program run · ${String(replayStep)} / 3`,
        title:
          replayStep === 3
            ? "You saw the program change the table"
            : "Run one move at a time",
        instruction:
          replayStep === 3
            ? "The checkpoint is ready. Take control of Mara."
            : "Choose Next step to watch source, trace, and table change together.",
        detail:
          replayStep === 0
            ? "Each game action is a reversible program cell. The first three are a guided replay."
            : "The highlighted cell, readable trace, and glowing room are three views of the same action.",
      };
    case "takeover":
      return {
        kicker: "Takeover · Human",
        title: "Move Mara to Azure Gate",
        instruction:
          "Take control: use the primary action, or click Mara and then the glowing Azure Gate.",
        detail:
          "Matching doors and Mara's available AP make this move legal. Then Ivo takes a turn.",
      };
    case "human-done":
      return {
        kicker: "Takeover · AI player",
        title: "Let Ivo choose a legal action",
        instruction:
          "Let GPT-5.6 Luna choose from Ivo's legal moves, or use the clearly labelled fallback.",
        detail:
          "Only opaque offered options reach the model; the browser revalidates the choice.",
      };
    case "ai-done":
      return {
        kicker: "Live design",
        title: "Change how Azure Gate works",
        instruction:
          "Create the prepared rule with GPT-5.6, or try the example rule through the same validator.",
        detail:
          "Source must parse, validate, execute speculatively, and roll back exactly before commit.",
      };
    case "rule-done":
      return {
        kicker: "Rule committed · Trigger setup",
        title: "Move Mara to Clockwork Archive",
        instruction:
          "Move Mara to Clockwork Archive so she can enter Azure Gate again.",
        detail:
          "The connected Mirror Gallery is still unoccupied, so the new Scenario can rotate it.",
      };
    case "return-to-gate":
      return {
        kicker: "Rule committed · Trigger now",
        title: "Re-enter Azure Gate",
        instruction:
          "Move Mara to Azure Gate and watch the new rule rotate Mirror Gallery.",
        detail:
          "The trace will include entity entry, Scenario match, and linked-room rotation.",
      };
    case "triggered":
      return {
        kicker: "Hero path complete",
        title: "The changed game remains playable",
        instruction:
          "Continue toward a real ending, return to the checkpoint, replay, or create a fresh copy.",
        detail:
          "The rule is a normal reversible cell; later actions still use the same runtime.",
      };
    case "shared":
      return {
        kicker: "Persistent shared room",
        title: "One ordered program, live in every browser",
        instruction:
          "Use a legal action here or from the Player link; pending patches rebase against one canonical head.",
        detail:
          "Reload, inspect the patch timeline, return live, or fork a prefix without changing the parent.",
      };
    case "free-play":
      return {
        kicker: "Fresh deterministic copy",
        title: "Play from setup to an ending",
        instruction:
          "Choose any legal action. The complete game can end in escape or vault collapse.",
        detail: "No OpenAI request is required to play the full sample.",
      };
  }
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
