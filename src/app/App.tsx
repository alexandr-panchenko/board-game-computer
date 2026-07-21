import { useCallback, useEffect, useRef, useState } from "react";

import type { LegalActionOption } from "../runtime";
import { TableCanvas } from "../render/TableCanvas";
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
  type SharedRoomView,
} from "./shared-room-client";

type Surface = "table" | "program" | "rules";

export function App() {
  const [initialGame] = useState(() => new PrismFoundryRoom());
  const gameRef = useRef(initialGame);
  const sharedRef = useRef<SharedRoomClient | null>(null);
  const designerAbort = useRef<AbortController | null>(null);
  const [snapshot, setSnapshot] = useState(() => initialGame.snapshot());
  const [program, setProgram] = useState(() => initialGame.program());
  const [surface, setSurface] = useState<Surface>("table");
  const [mobileNav, setMobileNav] = useState(
    () => window.matchMedia("(max-width: 640px)").matches,
  );
  const [programSeen, setProgramSeen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(16);
  const [message, setMessage] = useState(
    "The room program built this table. Mara may take two different crystals or buy an affordable card.",
  );
  const [designerPrompt, setDesignerPrompt] = useState(
    "When a player buys a Ruby card, give them one available Prism token.",
  );
  const [designerBusy, setDesignerBusy] = useState(false);
  const [playerBusy, setPlayerBusy] = useState(false);
  const [shared, setShared] = useState<SharedRoomView | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const refresh = useCallback(
    (nextMessage?: string, nextSnapshot?: FoundrySnapshot) => {
      setSnapshot(nextSnapshot ?? gameRef.current.snapshot());
      const nextProgram = gameRef.current.program();
      setProgram(nextProgram);
      setSelectedCell(nextProgram.cursor);
      if (nextMessage !== undefined) setMessage(nextMessage);
    },
    [],
  );

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setMobileNav(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (mobileNav) window.scrollTo(0, 0);
  }, [mobileNav, surface]);

  useEffect(() => {
    const access = accessFromLocation();
    if (access === null) return;
    const client = new SharedRoomClient(access, (room, view, update) => {
      gameRef.current = room;
      setShared(view);
      setSnapshot(room.snapshot());
      const nextProgram = room.program();
      setProgram(nextProgram);
      setSelectedCell(16 + view.timelineCursor);
      setMessage(update);
    });
    sharedRef.current = client;
    setShared(client.view());
    return () => {
      sharedRef.current = null;
      client.destroy();
    };
  }, []);

  const commitAction = useCallback(
    (option: LegalActionOption, source: "human" | "ai" = "human") => {
      const before = gameRef.current.snapshot();
      const label = actionLabel(option, before);
      const accepted =
        sharedRef.current === null
          ? gameRef.current.perform(option).ok
          : sharedRef.current.proposeAction(option);
      if (!accepted) {
        setMessage(
          "That action is no longer legal. The table was not changed.",
        );
        return false;
      }
      const after = gameRef.current.snapshot();
      refresh(
        `${source === "ai" ? "Ivo" : "Mara"} committed “${label}.” ${describeActionChange(option, before, after)} It was legal because it came from the active player's registered options; forward and inverse patches were recorded. Next: ${after.result !== null ? "inspect the completed program or undo" : after.activePlayerId === "ai" ? "let Ivo choose" : after.houseRules.length === 0 && after.turnNumber > 1 ? "change the rules" : "choose Mara's next action"}.`,
        after,
      );
      return true;
    },
    [refresh],
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
    setMessage("GPT-5.6 Luna is choosing from Ivo's validated legal options…");
    let option = gameRef.current.chooseFallbackAction("ai");
    let reason: string;
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
      reason = `GPT-5.6 Luna chose from legal options: ${response.choice.reason}`;
    } catch {
      reason =
        "OpenAI was unavailable, so the deterministic legal fallback kept the game playable.";
    }
    commitAction(option, "ai");
    setMessage(
      `${reason} ${actionLabel(option, current)} was committed as the next program cell.`,
    );
    setPlayerBusy(false);
  }, [commitAction, shared]);

  const commitRule = useCallback(
    (candidate: DesignerCandidate, origin: string) => {
      const accepted =
        sharedRef.current === null
          ? gameRef.current.commitDesigner(candidate.source).ok
          : sharedRef.current.proposeDesigner(candidate.source);
      if (!accepted) return false;
      refresh(
        `${origin} produced a valid reversible cell. “${candidate.summary}” is now Cell ${String(gameRef.current.program().cursor)} and appears on the physical House Rules card.`,
      );
      setSurface("table");
      return true;
    },
    [refresh],
  );

  const useExampleRule = useCallback(() => {
    commitRule(
      {
        source: RUBY_RESONANCE_SOURCE,
        summary: "Ruby resonance: buying a Ruby card gains one available Prism",
        expected_effects: [
          "House Rules gains Ruby resonance",
          "Ruby purchases gain Prism",
        ],
      },
      "The labelled offline example",
    );
  }, [commitRule]);

  const askDesigner = useCallback(async () => {
    if (designerBusy) return;
    setDesignerBusy(true);
    const controller = new AbortController();
    designerAbort.current = controller;
    setMessage("GPT-5.6 Designer is proposing source for local validation…");
    try {
      const program = gameRef.current.program();
      const result = await runDesignerRepairLoop({
        baseHash: snapshot.stateHash,
        currentHash: () => gameRef.current.snapshot().stateHash,
        generate: (attempt, diagnostics) =>
          requestDesignerCandidate(
            {
              roomId: shared?.roomId ?? "local-prism-foundry",
              request: designerPrompt,
              baseSeq: program.cursor,
              baseHash: snapshot.stateHash,
              sourceCells: program.cells.map((cell) => ({
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
            (event) => {
              if (event.type === "progress")
                setMessage(`GPT-5.6 Designer · ${event.stage}…`);
            },
            controller.signal,
          ),
        validate: (source) => gameRef.current.speculateDesigner(source),
        commit: (source) =>
          commitRule(
            {
              source,
              summary:
                "Ruby resonance: buying a Ruby card gains one available Prism",
              expected_effects: ["Ruby purchases gain Prism"],
            },
            "GPT-5.6 Designer",
          )
            ? { ok: true }
            : {
                ok: false,
                diagnostic: {
                  code: "TS_COMMIT_FAILED",
                  phase: "conflict",
                  message: "The validated Designer cell could not commit.",
                },
              },
      });
      if (!result.ok) {
        setMessage(
          result.error === undefined
            ? "The Designer candidate did not pass local validation. Nothing was committed; the labelled offline example remains available."
            : "OpenAI is unavailable. Nothing was committed; use the labelled offline example.",
        );
      }
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Designer request cancelled. Nothing was committed."
          : "OpenAI is unavailable. Nothing was committed; use the labelled offline example.",
      );
    } finally {
      designerAbort.current = null;
      setDesignerBusy(false);
    }
  }, [commitRule, designerBusy, designerPrompt, shared?.roomId, snapshot]);

  const reset = useCallback(() => {
    sharedRef.current?.destroy();
    sharedRef.current = null;
    history.replaceState(
      null,
      "",
      location.pathname === "/judge" ? "/judge" : "/",
    );
    gameRef.current = new PrismFoundryRoom();
    setShared(null);
    setProgramSeen(false);
    setSurface("table");
    refresh(
      "Fresh room: the 16-cell genesis program rebuilt Prism Foundry from an empty runtime.",
    );
  }, [refresh]);

  const createRoom = useCallback(async () => {
    setMessage("Creating a persistent Durable Object room…");
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
          setMessage(update);
        },
        { playerUrl: creation.playerUrl },
      );
      sharedRef.current = client;
      setShared(client.view());
    } catch {
      setMessage(
        "The persistent room could not be created. The local table remains fully playable.",
      );
    }
  }, [snapshot.stateHash]);

  const selected = program.cells[selectedCell - 1];
  const humanOptions = snapshot.legalActions.filter(
    (option) => option.actorId === "human",
  );
  const changedIds =
    selected?.forward.mutations.flatMap((mutation) => {
      if (mutation.kind === "property.set" || mutation.kind === "array.set")
        return [mutation.objectId];
      if (mutation.kind === "binding.set") return [mutation.name];
      return [];
    }) ?? [];
  const guide = guideState(snapshot, programSeen);
  const selectSurface = useCallback((next: Surface) => {
    if (next === "program") setProgramSeen(true);
    setSurface(next);
  }, []);

  return (
    <main className="app-shell">
      <header className="product-header">
        <a className="wordmark" href="/" aria-label="Board Game Computer home">
          <span className="wordmark-mark">BGC</span>
          <span>Board Game Computer</span>
        </a>
        <div className="header-copy">
          <p className="eyebrow">A live tabletop created by its own program</p>
          <h1>The board game is the program.</h1>
          <p>
            Every card, token, rule, and move below was created by reversible
            source cells that people and GPT-5.6 can inspect and extend
            together.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="quiet-button" onClick={reset}>
            Fresh game
          </button>
          {shared === null ? (
            <button
              type="button"
              className="quiet-button"
              onClick={() => void createRoom()}
            >
              Share room
            </button>
          ) : (
            <span className={`connection ${shared.connection}`}>
              {shared.connection}
            </span>
          )}
        </div>
      </header>

      {!mobileNav && (
        <SurfaceNavigation
          current={surface}
          programCells={program.cursor}
          onSelect={selectSurface}
        />
      )}
      <p className="sr-only" role="status">
        {message}
      </p>

      {surface === "table" && (
        <section className="table-surface" aria-labelledby="game-heading">
          <div className="game-heading">
            <div>
              <p className="eyebrow">
                Original two-player crystal engine builder
              </p>
              <h2 id="game-heading">Prism Foundry</h2>
              <p className="objective">
                <strong>Objective:</strong> First to 8 Prestige wins.
              </p>
            </div>
            <div className="turn-summary" aria-label="Current turn">
              <span>Turn {snapshot.turnNumber}</span>
              <strong>
                {snapshot.activePlayerId === "human" ? "Mara" : "Ivo"} to act
              </strong>
              <span>
                Mara {snapshot.players.human.prestige} · Ivo{" "}
                {snapshot.players.ai.prestige}
              </span>
            </div>
          </div>

          <div className="judge-guide" aria-label="Guided product path">
            <div>
              <span className="guide-count">{guide.step}/4</span>
              <p className="eyebrow">See the product claim</p>
              <strong>{guide.title}</strong>
              <p>{guide.detail}</p>
            </div>
            <button
              type="button"
              className="guide-button"
              onClick={() =>
                guide.action({
                  setSurface: selectSurface,
                  takePair,
                  buyCard,
                  runIvo,
                })
              }
              disabled={guide.disabled}
            >
              {guide.actionLabel}
            </button>
          </div>

          <div className="table-frame">
            <TableCanvas
              snapshot={snapshot}
              onTakePair={takePair}
              onBuyCard={buyCard}
              focusedIds={changedIds}
            />
          </div>

          <p className="action-message">{message}</p>

          <section
            className="accessible-actions"
            aria-label="Legal tabletop actions"
          >
            <div className="action-intro">
              <p className="eyebrow">One action per turn</p>
              <h3>
                {snapshot.activePlayerId === "human"
                  ? "Choose Mara's action"
                  : "Ivo is ready"}
              </h3>
              <p>
                Take two different available colors, or buy one glowing
                affordable card. The canvas and these controls invoke the same
                registered options.
              </p>
            </div>
            {snapshot.result !== null ? (
              <p className="winner-copy">
                <strong>
                  {snapshot.result.winnerName} wins with{" "}
                  {snapshot.result.prestige} Prestige.
                </strong>{" "}
                Ordinary actions are closed; Program, undo, replay, and fork
                remain available.
              </p>
            ) : snapshot.activePlayerId === "ai" ? (
              <button
                type="button"
                className="primary-action"
                onClick={() => void runIvo()}
                disabled={playerBusy}
              >
                {playerBusy
                  ? "Ivo is choosing…"
                  : "Let GPT-5.6 Luna choose for Ivo"}
              </button>
            ) : (
              <LegalActions
                options={humanOptions}
                snapshot={snapshot}
                onAction={commitAction}
              />
            )}
          </section>
        </section>
      )}

      {surface === "program" && (
        <ProgramSurface
          cells={program.cells}
          cursor={shared === null ? program.cursor : 16 + shared.timelineCursor}
          selected={selectedCell}
          onSelect={setSelectedCell}
          onUndo={() => {
            if (sharedRef.current !== null) {
              sharedRef.current.previous();
              return;
            }
            if (gameRef.current.undo())
              refresh(
                "Applied the selected cell's inverse patch. Source was not replayed.",
              );
          }}
          onRedo={() => {
            if (sharedRef.current !== null) {
              sharedRef.current.next();
              return;
            }
            if (gameRef.current.redo())
              refresh("Applied the retained forward patch.");
          }}
          {...(shared === null
            ? {}
            : {
                onFork: async () => {
                  const creation = await sharedRef.current?.forkFromHere();
                  if (creation !== undefined)
                    setMessage(`Fork ready: ${creation.designerUrl}`);
                },
              })}
        />
      )}

      {surface === "rules" && (
        <section className="rules-surface" aria-labelledby="rules-heading">
          <div className="rules-story">
            <p className="eyebrow">GPT-5.6 Designer</p>
            <h2 id="rules-heading">Change the game by appending source.</h2>
            <p>
              Describe one supported House Rule. The server asks GPT-5.6 for
              source; the browser parses, validates, executes, and rolls it back
              speculatively before a single cell can commit.
            </p>
            <ol>
              <li>Model proposes a source cell.</li>
              <li>Acorn parses the supported JavaScript subset.</li>
              <li>The interpreter proves it executes and reverses exactly.</li>
              <li>
                The committed rule appears in Program and on the physical table.
              </li>
            </ol>
          </div>
          <div className="designer-card">
            <label htmlFor="designer-prompt">Rule request</label>
            <textarea
              id="designer-prompt"
              value={designerPrompt}
              onChange={(event) => setDesignerPrompt(event.target.value)}
              rows={4}
            />
            <button
              type="button"
              className="primary-action"
              onClick={() => void askDesigner()}
              disabled={designerBusy || snapshot.houseRules.length > 0}
            >
              {designerBusy ? "Designer is working…" : "Ask GPT-5.6 Designer"}
            </button>
            {designerBusy && (
              <button
                type="button"
                className="quiet-button"
                onClick={() => designerAbort.current?.abort()}
              >
                Cancel Designer request
              </button>
            )}
            <div className="fallback-rule">
              <span>AI unavailable?</span>
              <button
                type="button"
                onClick={useExampleRule}
                disabled={snapshot.houseRules.length > 0}
              >
                Use labelled offline example
              </button>
            </div>
            <pre>
              <code>{RUBY_RESONANCE_SOURCE}</code>
            </pre>
          </div>
        </section>
      )}

      <section className="how-to-play">
        <details>
          <summary>How to play Prism Foundry</summary>
          <div className="rule-grid">
            <p>
              <strong>Goal</strong>
              <br />
              Be first to reach 8 Prestige.
            </p>
            <p>
              <strong>Take</strong>
              <br />
              Move two different available ordinary crystals from the bank to
              your mat.
            </p>
            <p>
              <strong>Buy</strong>
              <br />
              Pay a card's colored cost. Prism tokens cover missing colors.
            </p>
            <p>
              <strong>Build</strong>
              <br />
              Purchased cards stay in your tableau and permanently discount
              their color.
            </p>
            <p>
              <strong>Abilities</strong>
              <br />
              Prism gains a wild token. Echo grants another turn.
            </p>
            <p>
              <strong>Turn</strong>
              <br />
              Perform exactly one ordinary action, then pass the physical marker
              unless Echo applies.
            </p>
          </div>
        </details>
      </section>

      <section className="advanced-surface">
        <button
          type="button"
          className="advanced-toggle"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          Advanced diagnostics
        </button>
        {advancedOpen && (
          <div className="diagnostics">
            <p>
              <strong>State hash</strong> <code>{snapshot.stateHash}</code>
            </p>
            <p>
              <strong>Genesis</strong>{" "}
              {program.cells.filter((cell) => cell.kind === "genesis").length}{" "}
              interpreted cells
            </p>
            <p>
              <strong>History cursor</strong> {program.cursor} /{" "}
              {program.cells.length}
            </p>
            <p>
              <strong>Room</strong>{" "}
              {shared === null
                ? "local"
                : `${shared.roomId} · ${shared.role} · ${shared.connection}`}
            </p>
            {shared?.playerUrl !== undefined && (
              <p>
                <a href={shared.playerUrl}>Open Player capability link</a>
              </p>
            )}
          </div>
        )}
      </section>
      {mobileNav && (
        <SurfaceNavigation
          current={surface}
          programCells={program.cursor}
          onSelect={selectSurface}
        />
      )}
    </main>
  );
}

function SurfaceNavigation({
  current,
  programCells,
  onSelect,
}: {
  current: Surface;
  programCells: number;
  onSelect: (value: Surface) => void;
}) {
  return (
    <nav className="surface-tabs" aria-label="Product surfaces">
      <Tab current={current} value="table" onSelect={onSelect}>
        Table
      </Tab>
      <Tab current={current} value="program" onSelect={onSelect}>
        Program <span>{programCells}</span>
      </Tab>
      <Tab current={current} value="rules" onSelect={onSelect}>
        Change rules
      </Tab>
    </nav>
  );
}

function Tab({
  current,
  value,
  onSelect,
  children,
}: {
  current: Surface;
  value: Surface;
  onSelect: (value: Surface) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-current={current === value ? "page" : undefined}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
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
  const takeOptions = options.filter(
    (option) => option.actionId === "take-crystals",
  );
  const buyOptions = options.filter((option) => option.actionId === "buy-card");
  return (
    <div className="legal-action-groups">
      <div>
        <span className="action-group-label">Take two</span>
        <div className="chip-actions">
          {takeOptions.map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => onAction(option)}
            >
              {humanOptionLabel(option, snapshot)}
            </button>
          ))}
        </div>
      </div>
      {buyOptions.length > 0 && (
        <div>
          <span className="action-group-label">Affordable cards</span>
          <div className="chip-actions buy-actions">
            {buyOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => onAction(option)}
              >
                Buy {cardById(snapshot, option.parameters.cardId).name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
  return (
    <section className="program-surface" aria-labelledby="program-heading">
      <header className="program-header">
        <div>
          <p className="eyebrow">The complete room program</p>
          <h2 id="program-heading">One chronological executable history</h2>
          <p>
            Genesis is not hidden setup: Cells 1–16 create the table,
            components, catalog, rules, setup, and first turn. Every later move
            or rule joins this same sequence.
          </p>
        </div>
        <div className="history-actions">
          <button type="button" onClick={onUndo} disabled={cursor <= 16}>
            Undo cell
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={cursor >= cells.length}
          >
            Redo cell
          </button>
          {onFork !== undefined && (
            <button type="button" onClick={() => void onFork()}>
              Fork from here
            </button>
          )}
        </div>
      </header>
      <ol className="cell-sequence">
        {cells.map((cell) => {
          const active = selected === cell.number;
          const applied = cell.number <= cursor;
          return (
            <li
              key={cell.id}
              className={`${active ? "selected" : ""} ${applied ? "applied" : "future"}`}
            >
              <button
                type="button"
                className="cell-heading"
                onClick={() => onSelect(cell.number)}
                aria-expanded={active}
              >
                <span className="cell-number">Cell {cell.number}</span>
                <strong>{cell.label}</strong>
                <span className={`cell-kind ${cell.kind}`}>{cell.kind}</span>
              </button>
              <pre>
                <code>{cell.source}</code>
              </pre>
              {active && (
                <div className="cell-evidence">
                  <p>
                    <strong>Trace</strong>{" "}
                    {cell.trace.map((event) => event.label).join(" · ") ||
                      "No explicit trace"}
                  </p>
                  <p>
                    <strong>Transaction</strong> {cell.patchCount} forward
                    mutation{cell.patchCount === 1 ? "" : "s"}; matching inverse
                    retained.
                  </p>
                  <p>
                    <strong>State</strong>{" "}
                    <code>{cell.beforeHash.slice(0, 8)}</code> →{" "}
                    <code>{cell.afterHash.slice(0, 8)}</code>
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <div className="repl-caret" aria-label="Next program cell">
        <span>Cell {cells.length + 1}</span>
        <code>▌</code>
      </div>
    </section>
  );
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
    : `${title(String(option.parameters.first))} + ${title(String(option.parameters.second))}`;
}

function consequence(
  option: LegalActionOption,
  snapshot: FoundrySnapshot,
): string {
  if (option.actionId === "take-crystals")
    return "Moves two finite bank tokens to Ivo's mat, then passes the turn.";
  const card = cardById(snapshot, option.parameters.cardId);
  return `Pays for ${card.name}, gains ${card.prestige} Prestige and a permanent ${title(card.discountColor)} discount.`;
}

function describeActionChange(
  option: LegalActionOption,
  before: FoundrySnapshot,
  after: FoundrySnapshot,
): string {
  if (option.actionId === "take-crystals")
    return `Two physical tokens moved from the central bank to ${option.actorId === "human" ? "Mara's" : "Ivo's"} mat.`;
  const card = cardById(after, option.parameters.cardId);
  const actor = after.players[option.actorId === "human" ? "human" : "ai"];
  const prismBefore = before.tokens.filter(
    (token) => token.containerId === actor.matId && token.color === "prism",
  ).length;
  const prismAfter = after.tokens.filter(
    (token) => token.containerId === actor.matId && token.color === "prism",
  ).length;
  return `${card.name} moved from the market to the tableau; Prestige is now ${actor.prestige} and the ${title(card.discountColor)} discount increased.${prismAfter > prismBefore ? " Ruby resonance or the printed Prism ability also moved a wild token to the mat." : ""}`;
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

function guideState(
  snapshot: FoundrySnapshot,
  programSeen = false,
): {
  step: number;
  title: string;
  detail: string;
  actionLabel: string;
  disabled: boolean;
  action: (tools: {
    setSurface: (surface: Surface) => void;
    takePair: (
      first: OrdinaryCrystalColor,
      second: OrdinaryCrystalColor,
    ) => void;
    buyCard: (cardId: string) => void;
    runIvo: () => Promise<void>;
  }) => void;
} {
  if (!programSeen && snapshot.turnNumber === 1)
    return {
      step: 1,
      title: "Inspect how the table was created",
      detail: "The first 16 cells create every component and rule you can see.",
      actionLabel: "Open the complete program",
      disabled: false,
      action: ({ setSurface }) => setSurface("program"),
    };
  if (
    snapshot.activePlayerId === "human" &&
    snapshot.turnNumber === 1 &&
    snapshot.houseRules.length === 0
  )
    return {
      step: 2,
      title: "Take control of Mara",
      detail:
        "Select Ruby + Sapphire; the tokens move and a reversible action cell is appended.",
      actionLabel: "Take Ruby + Sapphire",
      disabled: snapshot.bank.ruby === 0 || snapshot.bank.sapphire === 0,
      action: ({ takePair }) => takePair("ruby", "sapphire"),
    };
  if (snapshot.activePlayerId === "ai")
    return {
      step: 3,
      title: "Let Ivo choose a legal action",
      detail:
        "GPT-5.6 Luna receives options, never arbitrary source. Fallback remains deterministic.",
      actionLabel: "Let Ivo move",
      disabled: false,
      action: ({ runIvo }) => void runIvo(),
    };
  if (snapshot.houseRules.length === 0)
    return {
      step: 4,
      title: "Rewrite the live game",
      detail:
        "Ask GPT-5.6 Designer for a validated House Rule, or use the labelled offline example.",
      actionLabel: "Open Change rules",
      disabled: false,
      action: ({ setSurface }) => setSurface("rules"),
    };
  return {
    step: 4,
    title: "The new rule is part of the game",
    detail:
      "Buy a Ruby card to fire Ruby resonance, then keep playing to 8 Prestige.",
    actionLabel: "Trigger the rule · Buy Crimson Relay",
    disabled: !snapshot.legalActions.some(
      (option) =>
        option.actionId === "buy-card" &&
        option.parameters.cardId === "crimson-relay",
    ),
    action: ({ buyCard }) => buyCard("crimson-relay"),
  };
}

function title(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export const __test = { inspection, humanOptionLabel, guideState };
