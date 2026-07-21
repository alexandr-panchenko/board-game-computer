import { useCallback, useEffect, useRef, useState } from "react";

import { TableCanvas } from "../render/TableCanvas";
import type { LegalActionOption } from "../runtime";
import {
  PrismFoundryRoom,
  RUBY_RESONANCE_SOURCE,
  actionLabel,
  cardById,
  type FoundryProgramCell,
  type FoundrySnapshot,
  type OrdinaryCrystalColor,
} from "../sample";
import type { DesignerCandidate } from "../shared/ai";
import { requestDesignerCandidate, requestPlayerChoice } from "./ai-client";
import { runDesignerRepairLoop } from "./designer-orchestrator";
import {
  SharedRoomClient,
  accessFromCreation,
  accessFromLocation,
  createSharedRoom,
  playerInviteFromStorage,
  type SharedRoomView,
} from "./shared-room-client";
import { highlightSource } from "./source-highlight";

type Panel = "agent" | "program" | "share" | "rulebook" | "advanced";
type AgentRole = "ivo" | "designer" | "you";

interface AgentMessage {
  id: number;
  role: AgentRole;
  text: string;
}

interface CellToast {
  number: number;
  label: string;
}

export function App() {
  const [initialGame] = useState(() => new PrismFoundryRoom());
  const gameRef = useRef(initialGame);
  const sharedRef = useRef<SharedRoomClient | null>(null);
  const designerAbort = useRef<AbortController | null>(null);
  const autoIvoKey = useRef<string | null>(null);
  const messageId = useRef(1);
  const [snapshot, setSnapshot] = useState(() => initialGame.snapshot());
  const [program, setProgram] = useState(() => initialGame.program());
  const [panel, setPanel] = useState<Panel | null>(null);
  const [guidedDemo, setGuidedDemo] = useState(
    () => window.location.pathname === "/judge",
  );
  const [selectedCell, setSelectedCell] = useState(16);
  const [changedIds, setChangedIds] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState(
    "Mara's turn. Take two different crystals or buy one affordable card.",
  );
  const [cellToast, setCellToast] = useState<CellToast | null>(null);
  const [designerPrompt, setDesignerPrompt] = useState(
    "When a player buys a Ruby card, give them one available Prism token.",
  );
  const [designerBusy, setDesignerBusy] = useState(false);
  const [designerProgress, setDesignerProgress] = useState<string | null>(null);
  const [playerBusy, setPlayerBusy] = useState(false);
  const [ivoNeedsRetry, setIvoNeedsRetry] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [shared, setShared] = useState<SharedRoomView | null>(null);
  const [roomStatus, setRoomStatus] = useState("Local game");
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      id: 1,
      role: "designer",
      text: "I can add a House Rule while you play.",
    },
  ]);

  const addAgentMessage = useCallback((role: AgentRole, text: string) => {
    messageId.current += 1;
    const id = messageId.current;
    setAgentMessages((messages) => [...messages, { id, role, text }]);
  }, []);

  const announce = useCallback((text: string) => setAnnouncement(text), []);

  const refresh = useCallback(
    (nextAnnouncement?: string, nextSnapshot?: FoundrySnapshot) => {
      const next = nextSnapshot ?? gameRef.current.snapshot();
      const nextProgram = gameRef.current.program();
      setSnapshot(next);
      setProgram(nextProgram);
      setSelectedCell(nextProgram.cursor);
      if (nextAnnouncement !== undefined) announce(nextAnnouncement);
    },
    [announce],
  );

  const recordLatestCell = useCallback(() => {
    const nextProgram = gameRef.current.program();
    const cell = nextProgram.cells[nextProgram.cursor - 1];
    if (cell === undefined) return;
    setProgram(nextProgram);
    setSelectedCell(cell.number);
    setChangedIds(changedObjectIds(cell));
    setCellToast({ number: cell.number, label: cell.label });
  }, []);

  useEffect(() => {
    const access = accessFromLocation();
    if (access === null) return;
    const storedPlayerInvite =
      access.role === "designer"
        ? playerInviteFromStorage(access.roomId)
        : undefined;
    const client = new SharedRoomClient(
      access,
      (room, view, update) => {
        gameRef.current = room;
        setShared(view);
        setSnapshot(room.snapshot());
        const nextProgram = room.program();
        setProgram(nextProgram);
        setSelectedCell(16 + view.timelineCursor);
        setRoomStatus(update);
      },
      storedPlayerInvite === undefined ? {} : { playerUrl: storedPlayerInvite },
    );
    sharedRef.current = client;
    setShared(client.view());
    return () => {
      sharedRef.current = null;
      client.destroy();
    };
  }, []);

  const commitAction = useCallback(
    (option: LegalActionOption, actor: "human" | "ai" = "human") => {
      const before = gameRef.current.snapshot();
      const label = actionLabel(option, before);
      const accepted =
        sharedRef.current === null
          ? gameRef.current.perform(option).ok
          : sharedRef.current.proposeAction(option);
      if (!accepted) {
        announce("That move is no longer available. Nothing changed.");
        return false;
      }
      const after = gameRef.current.snapshot();
      const change = describeActionChange(option, before, after);
      const resonanceFired =
        option.actionId === "buy-card" &&
        before.houseRules.length > 0 &&
        after.bank.prism < before.bank.prism;
      refresh(
        resonanceFired
          ? `The new rule fired! ${change}`
          : `${actor === "ai" ? "Ivo" : "Mara"}: ${label}. ${change}`,
        after,
      );
      recordLatestCell();
      return true;
    },
    [announce, recordLatestCell, refresh],
  );

  const takePair = useCallback(
    (first: OrdinaryCrystalColor, second: OrdinaryCrystalColor) => {
      const option = findTake(gameRef.current, first, second);
      if (option !== undefined) commitAction(option);
    },
    [commitAction],
  );

  const buyCard = useCallback(
    (cardId: string) => {
      const option = gameRef.current
        .legalActions("human")
        .find(
          (candidate) =>
            candidate.actionId === "buy-card" &&
            candidate.parameters.cardId === cardId,
        );
      if (option !== undefined) commitAction(option);
    },
    [commitAction],
  );

  const runIvo = useCallback(async () => {
    const current = gameRef.current.snapshot();
    if (current.activePlayerId !== "ai" || current.result !== null) return;
    const options = gameRef.current.legalActions("ai");
    if (options.length === 0) return;
    setPlayerBusy(true);
    setIvoNeedsRetry(false);
    announce("Ivo is choosing a move…");
    let option = gameRef.current.chooseFallbackAction("ai");
    let reason: string;
    let fallback = false;
    try {
      const response = await requestPlayerChoice({
        roomId: shared?.roomId ?? "local-prism-foundry",
        baseHash: current.stateHash,
        inspection: inspection(current),
        options: options.map((candidate) => ({
          optionId: candidate.id,
          label: actionLabel(candidate, current),
          consequence: consequence(candidate, current),
        })),
      });
      option =
        options.find(
          (candidate) => candidate.id === response.choice.option_id,
        ) ?? option;
      reason = response.choice.reason;
    } catch {
      fallback = true;
      reason =
        "The Table Agent was offline, so I used the deterministic fallback.";
    }
    const label = actionLabel(option, current);
    const committed = commitAction(option, "ai");
    if (committed) {
      addAgentMessage(
        "ivo",
        `${label}. ${reason}${fallback ? " Play stays fully available." : ""}`,
      );
      announce(`${label}. Ivo has finished; Mara is up next.`);
    } else {
      setIvoNeedsRetry(true);
      announce("Ivo couldn't finish that move. Try his turn again.");
    }
    setPlayerBusy(false);
  }, [addAgentMessage, announce, commitAction, shared]);

  const rubyPurchasedByMara = snapshot.cards.some(
    (card) => card.id === "crimson-relay" && card.ownerId === "human",
  );

  useEffect(() => {
    const canDriveIvo = shared === null || shared.role === "designer";
    if (
      !canDriveIvo ||
      snapshot.activePlayerId !== "ai" ||
      snapshot.result !== null ||
      playerBusy ||
      (guidedDemo && rubyPurchasedByMara)
    )
      return;
    const key = `${snapshot.turnNumber}:${snapshot.stateHash}`;
    if (autoIvoKey.current === key) return;
    const timer = window.setTimeout(() => {
      autoIvoKey.current = key;
      void runIvo();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [
    guidedDemo,
    playerBusy,
    rubyPurchasedByMara,
    runIvo,
    shared,
    snapshot.activePlayerId,
    snapshot.result,
    snapshot.stateHash,
    snapshot.turnNumber,
  ]);

  const commitRule = useCallback(
    (candidate: DesignerCandidate, offline: boolean) => {
      setDesignerProgress("Adding it to the game…");
      const accepted =
        sharedRef.current === null
          ? gameRef.current.commitDesigner(candidate.source).ok
          : sharedRef.current.proposeDesigner(candidate.source);
      if (!accepted) return false;
      refresh(
        "Ruby Resonance is now a physical House Rule. Buy a Ruby card to try it.",
      );
      recordLatestCell();
      addAgentMessage(
        "designer",
        `${offline ? "Offline example: " : ""}Ruby Resonance is now part of this game. Buy a Ruby card and the player gains an available Prism.`,
      );
      return true;
    },
    [addAgentMessage, recordLatestCell, refresh],
  );

  const useExampleRule = useCallback(() => {
    addAgentMessage("you", designerPrompt);
    commitRule(
      {
        source: RUBY_RESONANCE_SOURCE,
        summary: "Ruby resonance",
        expected_effects: ["Ruby purchases gain Prism"],
      },
      true,
    );
  }, [addAgentMessage, commitRule, designerPrompt]);

  const askDesigner = useCallback(async () => {
    if (designerBusy || shared?.role === "player") return;
    setDesignerBusy(true);
    setDesignerProgress("Writing the rule…");
    addAgentMessage("you", designerPrompt);
    const controller = new AbortController();
    designerAbort.current = controller;
    try {
      const currentProgram = gameRef.current.program();
      const result = await runDesignerRepairLoop({
        baseHash: snapshot.stateHash,
        currentHash: () => gameRef.current.snapshot().stateHash,
        generate: (attempt, diagnostics) =>
          requestDesignerCandidate(
            {
              roomId: shared?.roomId ?? "local-prism-foundry",
              request: designerPrompt,
              baseSeq: currentProgram.cursor,
              baseHash: snapshot.stateHash,
              sourceCells: currentProgram.cells.map((cell) => ({
                id: cell.id,
                kind:
                  cell.kind === "genesis"
                    ? cell.id.includes("table") || cell.id.includes("market")
                      ? "setup"
                      : "rule"
                    : cell.kind === "action"
                      ? "action"
                      : "rule",
                source: cell.source,
              })),
              inspection: inspection(snapshot),
              attempt,
              diagnostics,
            },
            () => setDesignerProgress("Writing the rule…"),
            controller.signal,
          ),
        validate: (source) => {
          setDesignerProgress("Checking it…");
          return gameRef.current.speculateDesigner(source);
        },
        commit: (source) =>
          commitRule(
            {
              source,
              summary: "Ruby resonance",
              expected_effects: ["Ruby purchases gain Prism"],
            },
            false,
          )
            ? { ok: true }
            : {
                ok: false,
                diagnostic: {
                  code: "TS_COMMIT_FAILED",
                  phase: "conflict",
                  message: "The checked rule could not be added.",
                },
              },
      });
      if (!result.ok) {
        const text =
          result.error === undefined
            ? "I couldn't safely add that rule. Nothing changed; the offline example is ready."
            : "I couldn't reach the Designer. Nothing changed; the offline example is ready.";
        announce(text);
        addAgentMessage("designer", text);
      }
    } catch (error) {
      const text =
        error instanceof DOMException && error.name === "AbortError"
          ? "Rule request cancelled. Nothing changed."
          : "I couldn't reach the Designer. Nothing changed; the offline example is ready.";
      announce(text);
      addAgentMessage("designer", text);
    } finally {
      designerAbort.current = null;
      setDesignerProgress(null);
      setDesignerBusy(false);
    }
  }, [
    addAgentMessage,
    announce,
    commitRule,
    designerBusy,
    designerPrompt,
    shared?.role,
    shared?.roomId,
    snapshot,
  ]);

  const reset = useCallback(() => {
    sharedRef.current?.destroy();
    sharedRef.current = null;
    history.replaceState(
      null,
      "",
      window.location.pathname === "/judge" ? "/judge" : "/",
    );
    gameRef.current = new PrismFoundryRoom();
    setShared(null);
    setPanel(null);
    setCellToast(null);
    setChangedIds([]);
    setAgentMessages([
      {
        id: 1,
        role: "designer",
        text: "I can add a House Rule while you play.",
      },
    ]);
    messageId.current = 1;
    autoIvoKey.current = null;
    refresh("Fresh game. Mara takes the first turn.");
  }, [refresh]);

  const createRoom = useCallback(async () => {
    if (creatingRoom) return;
    setCreatingRoom(true);
    announce("Creating your shared room…");
    try {
      const creation = await createSharedRoom(snapshot.stateHash);
      const access = accessFromCreation(creation);
      const client = new SharedRoomClient(
        access,
        (room, view, update) => {
          gameRef.current = room;
          setShared(view);
          setSnapshot(room.snapshot());
          const nextProgram = room.program();
          setProgram(nextProgram);
          setSelectedCell(16 + view.timelineCursor);
          setRoomStatus(update);
        },
        { playerUrl: creation.playerUrl },
      );
      sharedRef.current = client;
      setShared(client.view());
      setGuidedDemo(false);
      setPanel("share");
      announce(
        "Shared room created. Send the Player invite link to your guest.",
      );
    } catch {
      announce(
        "The shared room could not be created. This local game is still playable.",
      );
    } finally {
      setCreatingRoom(false);
    }
  }, [announce, creatingRoom, snapshot.stateHash]);

  const openProgram = useCallback((cell = gameRef.current.program().cursor) => {
    setSelectedCell(cell);
    setPanel("program");
    setCellToast(null);
  }, []);

  const cursor = shared === null ? program.cursor : 16 + shared.timelineCursor;
  const guide = heroGuide(snapshot, rubyPurchasedByMara);
  const humanOptions = snapshot.legalActions.filter(
    (option) => option.actorId === "human",
  );
  const recommendedColors =
    guidedDemo && guide.step === 1
      ? (["ruby", "sapphire"] as OrdinaryCrystalColor[])
      : [];
  const recommendedCardId =
    guidedDemo && guide.step === 4 && !rubyPurchasedByMara
      ? "crimson-relay"
      : undefined;

  return (
    <main className="app-shell">
      <header className="product-header">
        <a className="wordmark" href="/" aria-label="Board Game Computer home">
          <span className="wordmark-mark">BGC</span>
          <span>Board Game Computer</span>
        </a>
        <div className="header-copy">
          <p className="eyebrow">Board Game Computer</p>
          <h1>Play the game. Rewrite the rules.</h1>
          <p>
            Collect crystals, build your engine, and ask the table to add a new
            rule while you play.
          </p>
          <span className="proof-badge">
            Powered by a live, reversible program
          </span>
        </div>
        <div className="header-actions">
          {shared === null ? (
            <button
              type="button"
              className="room-state local"
              title="Create a shared room to invite another player."
              onClick={() => void createRoom()}
              disabled={creatingRoom}
            >
              <span>Local game</span>
              <strong>
                {creatingRoom ? "Creating…" : "Create shared room"}
              </strong>
            </button>
          ) : (
            <button
              type="button"
              className="room-state"
              onClick={() => setPanel("share")}
            >
              <span>Room {shortRoomId(shared.roomId)}</span>
              <strong className={`connection ${shared.connection}`}>
                {title(shared.connection)} · {title(shared.role)}
              </strong>
            </button>
          )}
          <button
            type="button"
            className="header-icon-button"
            onClick={() => setPanel("agent")}
          >
            Table Agent
          </button>
          <button
            type="button"
            className="header-icon-button"
            onClick={() => openProgram()}
          >
            Program <span>{program.cursor}</span>
          </button>
        </div>
      </header>

      <p className="sr-only" role="status">
        {announcement}
      </p>

      <div className={`workspace ${panel === null ? "" : "panel-open"}`}>
        <section className="table-surface" aria-labelledby="game-heading">
          <div className="game-strip">
            <div>
              <h2 id="game-heading">Prism Foundry</h2>
              <p>
                <strong>Be the first player to reach 8 Prestige.</strong>
              </p>
              <p>On your turn: take two different crystals or buy one card.</p>
            </div>
            <div
              className={`turn-card ${snapshot.activePlayerId}`}
              aria-label="Current turn"
            >
              <span>Turn {snapshot.turnNumber}</span>
              <strong>
                {snapshot.activePlayerId === "human"
                  ? "Mara's turn"
                  : "Ivo's turn"}
              </strong>
              <small>
                Mara {snapshot.players.human.prestige} · Ivo{" "}
                {snapshot.players.ai.prestige}
              </small>
            </div>
          </div>

          {guidedDemo && (
            <HeroCoach
              guide={guide}
              busy={playerBusy}
              onOpenAgent={() => setPanel("agent")}
              onOpenProgram={() => openProgram()}
            />
          )}

          <div className="table-frame">
            <TableCanvas
              snapshot={snapshot}
              onTakePair={takePair}
              onBuyCard={buyCard}
              onRulebook={() => setPanel("rulebook")}
              onHouseRules={() => setPanel("agent")}
              focusedIds={changedIds}
              recommendedColors={recommendedColors}
              {...(recommendedCardId === undefined
                ? {}
                : { recommendedCardId })}
              ivoThinking={playerBusy}
            />

            <div className="table-toolbar">
              <details className="actions-popover">
                <summary>Actions</summary>
                <LegalActions
                  options={humanOptions}
                  snapshot={snapshot}
                  onAction={commitAction}
                />
              </details>
              <button type="button" onClick={() => setPanel("rulebook")}>
                Rulebook
              </button>
              <button type="button" onClick={() => setPanel("advanced")}>
                Advanced
              </button>
            </div>

            {cellToast !== null && (
              <div className="cell-toast">
                <div>
                  <strong>Cell {cellToast.number} added</strong>
                  <span>{cellToast.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openProgram(cellToast.number)}
                >
                  View source
                </button>
              </div>
            )}

            <div className="table-announcement" aria-live="polite">
              {announcement}
            </div>
          </div>

          {snapshot.result !== null && (
            <div className="winner-copy">
              <strong>
                {snapshot.result.winnerName} wins with{" "}
                {snapshot.result.prestige} Prestige.
              </strong>
              <button type="button" onClick={() => openProgram()}>
                View the final program
              </button>
            </div>
          )}

          <div className="ordinary-tools">
            <button type="button" onClick={reset}>
              Fresh game
            </button>
            {!guidedDemo && <a href="/judge">Guided demo</a>}
            {snapshot.activePlayerId === "ai" && !playerBusy && (
              <button type="button" onClick={() => void runIvo()}>
                {ivoNeedsRetry ? "Retry Ivo's turn" : "Play Ivo's turn"}
              </button>
            )}
          </div>
        </section>

        {panel !== null && (
          <SidePanel title={panelTitle(panel)} onClose={() => setPanel(null)}>
            {panel === "agent" && (
              <TableAgent
                messages={agentMessages}
                prompt={designerPrompt}
                onPrompt={setDesignerPrompt}
                busy={designerBusy}
                progress={designerProgress}
                hasRule={snapshot.houseRules.length > 0}
                isPlayer={shared?.role === "player"}
                ivoBusy={playerBusy}
                ivoNeedsRetry={ivoNeedsRetry}
                onAsk={() => void askDesigner()}
                onFallback={useExampleRule}
                onCancel={() => designerAbort.current?.abort()}
                onRunIvo={() => void runIvo()}
              />
            )}
            {panel === "program" && (
              <ProgramSurface
                cells={program.cells}
                cursor={cursor}
                selected={selectedCell}
                onSelect={setSelectedCell}
                onUndo={() => {
                  if (sharedRef.current !== null) {
                    if (sharedRef.current.previous())
                      announce("Moved one cell back in room history.");
                    return;
                  }
                  if (gameRef.current.undo()) {
                    refresh(
                      "Undid the latest cell. The table returned to its previous state.",
                    );
                    setChangedIds([]);
                  }
                }}
                onRedo={() => {
                  if (sharedRef.current !== null) {
                    if (sharedRef.current.next())
                      announce("Moved one cell forward in room history.");
                    return;
                  }
                  if (gameRef.current.redo()) {
                    refresh(
                      "Redid the cell. The table returned to the later state.",
                    );
                    setChangedIds([]);
                  }
                }}
                {...(shared === null
                  ? {}
                  : {
                      onFork: async () => {
                        const creation =
                          await sharedRef.current?.forkFromHere();
                        if (creation !== undefined) {
                          announce(
                            "A new room was forked here. The original room is unchanged.",
                          );
                          setPanel("share");
                        }
                      },
                    })}
              />
            )}
            {panel === "share" && (
              <SharePanel
                shared={shared}
                creating={creatingRoom}
                roomStatus={roomStatus}
                onCreate={() => void createRoom()}
                onCopied={announce}
              />
            )}
            {panel === "rulebook" && <RulebookPanel />}
            {panel === "advanced" && (
              <AdvancedPanel
                snapshot={snapshot}
                program={program.cells}
                cursor={cursor}
                shared={shared}
                roomStatus={roomStatus}
              />
            )}
          </SidePanel>
        )}
      </div>

      <nav className="mobile-nav" aria-label="Table tools">
        <button
          type="button"
          aria-current={panel === null ? "page" : undefined}
          onClick={() => setPanel(null)}
        >
          Table
        </button>
        <button
          type="button"
          aria-current={panel === "agent" ? "page" : undefined}
          onClick={() => setPanel("agent")}
        >
          Table Agent
        </button>
        <button
          type="button"
          aria-current={panel === "program" ? "page" : undefined}
          onClick={() => openProgram()}
        >
          Program
        </button>
        <button
          type="button"
          aria-current={panel === "share" ? "page" : undefined}
          onClick={() => setPanel("share")}
        >
          Share
        </button>
      </nav>
    </main>
  );
}

function HeroCoach({
  guide,
  busy,
  onOpenAgent,
  onOpenProgram,
}: {
  guide: ReturnType<typeof heroGuide>;
  busy: boolean;
  onOpenAgent: () => void;
  onOpenProgram: () => void;
}) {
  return (
    <div className="hero-coach" aria-label="Guided demo">
      <span className="demo-count">Demo · {guide.step} of 4</span>
      <div>
        <strong>{guide.title}</strong>
        <p>{guide.detail}</p>
      </div>
      {guide.action === "agent" && (
        <button type="button" className="coach-action" onClick={onOpenAgent}>
          Change a rule
        </button>
      )}
      {guide.action === "program" && (
        <button type="button" className="coach-action" onClick={onOpenProgram}>
          View the new cells
        </button>
      )}
      {guide.action === "thinking" && (
        <span className="coach-thinking">
          <span className="thinking-dot" />
          {busy ? "Ivo is choosing…" : "Ivo is ready"}
        </span>
      )}
      {guide.action === "table" && (
        <span className="coach-table-cue">
          Use the highlighted piece on the table
        </span>
      )}
    </div>
  );
}

function TableAgent({
  messages,
  prompt,
  onPrompt,
  busy,
  progress,
  hasRule,
  isPlayer,
  ivoBusy,
  ivoNeedsRetry,
  onAsk,
  onFallback,
  onCancel,
  onRunIvo,
}: {
  messages: AgentMessage[];
  prompt: string;
  onPrompt: (value: string) => void;
  busy: boolean;
  progress: string | null;
  hasRule: boolean;
  isPlayer: boolean;
  ivoBusy: boolean;
  ivoNeedsRetry: boolean;
  onAsk: () => void;
  onFallback: () => void;
  onCancel: () => void;
  onRunIvo: () => void;
}) {
  return (
    <section className="agent-panel" aria-labelledby="agent-heading">
      <header>
        <p className="panel-kicker">Table Agent</p>
        <h2 id="agent-heading">Play together. Change the game.</h2>
        <p>Ivo plays a seat. The Designer may add checked House Rules.</p>
      </header>
      <div className="agent-conversation" aria-label="Table Agent conversation">
        {messages.map((message) => (
          <article className={`agent-message ${message.role}`} key={message.id}>
            <span className="role-badge">{roleLabel(message.role)}</span>
            <p>{message.text}</p>
          </article>
        ))}
        {progress !== null && (
          <article className="agent-message designer working" role="status">
            <span className="role-badge">Designer · Rules</span>
            <p>
              <span className="thinking-dot" /> {progress}
            </p>
          </article>
        )}
      </div>

      {(ivoNeedsRetry || ivoBusy) && (
        <button
          type="button"
          className="secondary-action"
          onClick={onRunIvo}
          disabled={ivoBusy}
        >
          {ivoBusy ? "Ivo is choosing…" : "Play Ivo's turn"}
        </button>
      )}

      <div className="agent-composer">
        <span className="intent-chip">Change a rule</span>
        <label htmlFor="designer-prompt">What should happen?</label>
        <textarea
          id="designer-prompt"
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
          rows={4}
          disabled={isPlayer || hasRule}
        />
        {isPlayer ? (
          <p className="permission-note">
            Only the room Designer can change rules. You can still play and
            inspect the Program.
          </p>
        ) : (
          <button
            type="button"
            className="primary-action"
            onClick={onAsk}
            disabled={busy || hasRule}
          >
            {hasRule
              ? "Rule added"
              : busy
                ? "Adding the rule…"
                : "Ask the Designer"}
          </button>
        )}
        {busy && (
          <button type="button" className="text-button" onClick={onCancel}>
            Cancel
          </button>
        )}
        {!hasRule && !busy && !isPlayer && (
          <button
            type="button"
            className="fallback-button"
            onClick={onFallback}
          >
            Use labelled offline example
          </button>
        )}
        <details className="validation-details">
          <summary>How this was validated</summary>
          <p>
            The candidate source is parsed, capability-checked, executed
            speculatively, and returned to the exact prior state before commit.
            Invalid source never joins the room.
          </p>
        </details>
      </div>
    </section>
  );
}

function ProgramSurface({
  cells,
  cursor,
  selected,
  onSelect,
  onUndo,
  onRedo,
  onFork,
}: {
  cells: FoundryProgramCell[];
  cursor: number;
  selected: number;
  onSelect: (number: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFork?: () => Promise<void>;
}) {
  useEffect(() => {
    document
      .getElementById(`program-cell-${selected}`)
      ?.scrollIntoView({ block: "center" });
  }, [selected]);
  const selectedCell = cells[selected - 1];
  return (
    <section className="program-panel" aria-labelledby="program-heading">
      <header className="program-panel-header">
        <p className="panel-kicker">Program</p>
        <h2 id="program-heading">Live room program</h2>
        <p>Everything on the table was created by the source below.</p>
        <div className="history-actions">
          <button type="button" onClick={onUndo} disabled={cursor <= 16}>
            Undo
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={cursor >= cells.length}
          >
            Redo
          </button>
          {onFork !== undefined && (
            <button type="button" onClick={() => void onFork()}>
              Fork here
            </button>
          )}
        </div>
      </header>
      <div className="code-surface" aria-label="Chronological room source">
        {cells.map((cell) => (
          <article
            id={`program-cell-${cell.number}`}
            key={cell.id}
            className={`program-cell ${selected === cell.number ? "selected" : ""} ${cell.number <= cursor ? "applied" : "future"}`}
            data-cell-number={cell.number}
          >
            <button
              type="button"
              className="code-gutter"
              aria-label={`Inspect Cell ${cell.number}: ${cell.label}`}
              onClick={() => onSelect(cell.number)}
            >
              <span>{cell.number}</span>
              <small>{cellAuthor(cell)}</small>
            </button>
            <div className="code-block" onClick={() => onSelect(cell.number)}>
              <div className="cell-comment">
                // {cell.number} · {cell.label}
              </div>
              <pre>
                <code>{highlightSource(cell.source)}</code>
              </pre>
            </div>
          </article>
        ))}
        <div className="code-caret">
          <span>{cells.length + 1}</span>
          <code>▌</code>
        </div>
      </div>
      {selectedCell !== undefined && (
        <details className="cell-inspector">
          <summary>Cell {selectedCell.number} details</summary>
          <dl>
            <div>
              <dt>Author</dt>
              <dd>{cellAuthor(selectedCell)}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{selectedCell.kind}</dd>
            </div>
            <div>
              <dt>Trace</dt>
              <dd>
                {selectedCell.trace.map((event) => event.label).join(" · ") ||
                  "No explicit trace"}
              </dd>
            </div>
            <div>
              <dt>Forward mutations</dt>
              <dd>{selectedCell.patchCount}</dd>
            </div>
            <div>
              <dt>Inverse</dt>
              <dd>Available</dd>
            </div>
            <div>
              <dt>State hash</dt>
              <dd>
                <code>{selectedCell.beforeHash.slice(0, 8)}</code> →{" "}
                <code>{selectedCell.afterHash.slice(0, 8)}</code>
              </dd>
            </div>
          </dl>
        </details>
      )}
    </section>
  );
}

function SharePanel({
  shared,
  creating,
  roomStatus,
  onCreate,
  onCopied,
}: {
  shared: SharedRoomView | null;
  creating: boolean;
  roomStatus: string;
  onCreate: () => void;
  onCopied: (message: string) => void;
}) {
  if (shared === null)
    return (
      <section className="share-panel">
        <p className="panel-kicker">Local game</p>
        <h2>Create a shared room</h2>
        <p>
          This game currently lives in this browser. Create a persistent room to
          invite another player.
        </p>
        <button
          type="button"
          className="primary-action"
          onClick={onCreate}
          disabled={creating}
        >
          {creating ? "Creating…" : "Create shared room"}
        </button>
      </section>
    );
  const roomReference = `${window.location.origin}/room/${shared.roomId}`;
  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onCopied(message);
    } catch {
      onCopied("Copy was blocked by the browser. Use the open link instead.");
    }
  };
  return (
    <section className="share-panel" aria-labelledby="share-heading">
      <p className="panel-kicker">Prism Foundry room</p>
      <h2 id="share-heading">Invite another player</h2>
      <dl className="room-facts">
        <div>
          <dt>Room ID</dt>
          <dd>{shortRoomId(shared.roomId)}</dd>
        </div>
        <div>
          <dt>Connection</dt>
          <dd className={`connection ${shared.connection}`}>
            {title(shared.connection)}
          </dd>
        </div>
        <div>
          <dt>Your role</dt>
          <dd>{title(shared.role)}</dd>
        </div>
      </dl>
      {shared.playerUrl !== undefined ? (
        <div className="share-actions">
          <button
            type="button"
            className="primary-action"
            onClick={() =>
              void copy(shared.playerUrl!, "Player invite copied.")
            }
          >
            Copy player invite
          </button>
          <a
            className="secondary-action"
            href={shared.playerUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open player view
          </a>
          <button
            type="button"
            className="secondary-action"
            onClick={() => void copy(roomReference, "Room reference copied.")}
          >
            Copy room reference
          </button>
          <p className="share-note">
            Send the Player invite link—not the bare room URL—to another player.
          </p>
        </div>
      ) : (
        <p className="permission-note">
          This Player session does not expose the room's invite capability. Ask
          the Designer for the Player invite link.
        </p>
      )}
      <details className="room-technical">
        <summary>Connection details</summary>
        <p>{roomStatus}</p>
      </details>
    </section>
  );
}

function RulebookPanel() {
  return (
    <section className="rulebook-panel" aria-labelledby="rulebook-heading">
      <p className="panel-kicker">Prism Foundry</p>
      <h2 id="rulebook-heading">Rulebook</h2>
      <ol>
        <li>Reach 8 Prestige first.</li>
        <li>Take two different crystals OR buy one card.</li>
        <li>Purchased cards give permanent discounts.</li>
        <li>Prism tokens can pay for any color.</li>
        <li>
          Some cards and House Rules change what happens after a purchase.
        </li>
      </ol>
    </section>
  );
}

function AdvancedPanel({
  snapshot,
  program,
  cursor,
  shared,
  roomStatus,
}: {
  snapshot: FoundrySnapshot;
  program: FoundryProgramCell[];
  cursor: number;
  shared: SharedRoomView | null;
  roomStatus: string;
}) {
  return (
    <section className="advanced-panel">
      <p className="panel-kicker">Developer diagnostics</p>
      <h2>Advanced</h2>
      <dl>
        <div>
          <dt>State hash</dt>
          <dd>
            <code>{snapshot.stateHash}</code>
          </dd>
        </div>
        <div>
          <dt>Genesis cells</dt>
          <dd>{program.filter((cell) => cell.kind === "genesis").length}</dd>
        </div>
        <div>
          <dt>History cursor</dt>
          <dd>
            {cursor} / {program.length}
          </dd>
        </div>
        <div>
          <dt>Room</dt>
          <dd>
            {shared === null
              ? "Local runtime"
              : `${shared.roomId} · ${shared.role} · ${shared.connection}`}
          </dd>
        </div>
        <div>
          <dt>Connection log</dt>
          <dd>{roomStatus}</dd>
        </div>
      </dl>
      <p>
        The browser executes the Acorn-validated JavaScript subset. Successful
        cells retain forward and inverse patches; the server orders source but
        does not execute the simulation.
      </p>
    </section>
  );
}

function SidePanel({
  title: panelName,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className="side-panel" aria-label={panelName}>
      <div className="panel-topbar">
        <span>{panelName}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${panelName}`}
        >
          Close
        </button>
      </div>
      <div className="panel-scroll">{children}</div>
    </aside>
  );
}

function LegalActions({
  options,
  snapshot,
  onAction,
}: {
  options: LegalActionOption[];
  snapshot: FoundrySnapshot;
  onAction: (option: LegalActionOption) => void;
}) {
  if (options.length === 0)
    return <p>No Mara actions are available right now.</p>;
  return (
    <div className="semantic-actions">
      {options.map((option) => (
        <button type="button" key={option.id} onClick={() => onAction(option)}>
          {humanOptionLabel(option, snapshot)}
        </button>
      ))}
    </div>
  );
}

function heroGuide(
  snapshot: FoundrySnapshot,
  rubyPurchased: boolean,
): {
  step: number;
  title: string;
  detail: string;
  action: "table" | "thinking" | "agent" | "program";
} {
  if (rubyPurchased)
    return {
      step: 4,
      title: "Your new rule fired",
      detail:
        "Ruby Resonance added a Prism. Open the latest cells or keep playing.",
      action: "program",
    };
  if (snapshot.houseRules.length > 0)
    return {
      step: 4,
      title: "Trigger Ruby Resonance",
      detail:
        "Select the glowing Crimson Relay and review its payment, then buy it.",
      action: "table",
    };
  if (snapshot.activePlayerId === "ai")
    return {
      step: 2,
      title: "Ivo's turn",
      detail:
        "Ivo chooses from the moves available to his seat and plays automatically.",
      action: "thinking",
    };
  if (snapshot.turnNumber === 1)
    return {
      step: 1,
      title: "Take two crystals",
      detail:
        "Select Ruby, then Sapphire in the central bank and confirm the move to Mara's mat.",
      action: "table",
    };
  return {
    step: 3,
    title: "Invent a House Rule",
    detail:
      "Ask the Table Agent to add Ruby Resonance while the table stays in view.",
    action: "agent",
  };
}

function findTake(
  game: PrismFoundryRoom,
  first: OrdinaryCrystalColor,
  second: OrdinaryCrystalColor,
) {
  return game
    .legalActions("human")
    .find(
      (option) =>
        option.actionId === "take-crystals" &&
        [option.parameters.first, option.parameters.second].includes(first) &&
        [option.parameters.first, option.parameters.second].includes(second),
    );
}

function humanOptionLabel(
  option: LegalActionOption,
  snapshot: FoundrySnapshot,
): string {
  return option.actionId === "buy-card"
    ? `Buy ${cardById(snapshot, option.parameters.cardId).name}`
    : `Take ${title(String(option.parameters.first))} + ${title(String(option.parameters.second))}`;
}

function consequence(
  option: LegalActionOption,
  snapshot: FoundrySnapshot,
): string {
  if (option.actionId === "take-crystals")
    return "Take two available colors, then pass the turn.";
  const card = cardById(snapshot, option.parameters.cardId);
  return `Buy ${card.name}, gain ${card.prestige} Prestige, and add a permanent ${title(card.discountColor)} discount.`;
}

function describeActionChange(
  option: LegalActionOption,
  before: FoundrySnapshot,
  after: FoundrySnapshot,
): string {
  if (option.actionId === "take-crystals")
    return `Two crystals moved from the bank to ${option.actorId === "human" ? "Mara's" : "Ivo's"} mat.`;
  const card = cardById(after, option.parameters.cardId);
  const actor = after.players[option.actorId === "human" ? "human" : "ai"];
  const prismBefore = before.tokens.filter(
    (token) => token.containerId === actor.matId && token.color === "prism",
  ).length;
  const prismAfter = after.tokens.filter(
    (token) => token.containerId === actor.matId && token.color === "prism",
  ).length;
  return `${card.name} moved to the tableau. ${actor.name} now has ${actor.prestige} Prestige and a ${title(card.discountColor)} discount.${prismAfter > prismBefore ? " A Prism also moved to the mat." : ""}`;
}

function inspection(snapshot: FoundrySnapshot): string {
  return JSON.stringify({
    title: snapshot.title,
    objective: snapshot.objective,
    activePlayer: snapshot.activePlayerId,
    turn: snapshot.turnNumber,
    prestige: {
      Mara: snapshot.players.human.prestige,
      Ivo: snapshot.players.ai.prestige,
    },
    bank: snapshot.bank,
    market: snapshot.market.map((id) => cardById(snapshot, id).name),
    houseRules: snapshot.houseRules.map((rule) => rule.name),
  });
}

function changedObjectIds(cell: FoundryProgramCell): string[] {
  return cell.forward.mutations.flatMap((mutation) => {
    if (mutation.kind === "property.set" || mutation.kind === "array.set")
      return [mutation.objectId];
    if (mutation.kind === "binding.set") return [mutation.name];
    return [];
  });
}

function roleLabel(role: AgentRole): string {
  if (role === "ivo") return "Ivo · Player";
  if (role === "designer") return "Designer · Rules";
  return "You · Rule request";
}

function cellAuthor(cell: FoundryProgramCell): string {
  if (cell.kind === "genesis") return "Game";
  if (cell.kind === "designer") return "Designer";
  return /actorId:\s*["']ai["']/.test(cell.source) ? "Ivo" : "Mara";
}

function panelTitle(panel: Panel): string {
  if (panel === "agent") return "Table Agent";
  if (panel === "program") return "Program";
  if (panel === "share") return "Share room";
  if (panel === "rulebook") return "Rulebook";
  return "Advanced";
}

function shortRoomId(roomId: string): string {
  return roomId
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase();
}

function title(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export const __test = { inspection, humanOptionLabel, heroGuide };
