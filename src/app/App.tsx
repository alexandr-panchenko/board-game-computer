import { useState } from "react";

import { RoomRuntime } from "../runtime";
import { APP_NAME, LANGUAGE_VERSION } from "../shared/versions";

const rooms = [
  "Glass Gallery",
  "Azure Gate",
  "Mirror Gallery",
  "Echo Hall",
  "Archive",
  "Reliquary",
];

export function App() {
  const isJudge = window.location.pathname === "/judge";
  const [runtime] = useState(() => new RoomRuntime());
  const [source, setSource] = useState(
    'let score = 1; trace("score-created");',
  );
  const [message, setMessage] = useState("Ready for a reversible source cell.");
  const [trace, setTrace] = useState("No trace recorded yet.");
  const [, setRevision] = useState(0);

  const refresh = () => setRevision((value) => value + 1);
  const runCell = () => {
    const result = runtime.executeCell(source);
    setMessage(
      result.ok
        ? `Committed ${result.cellId}: ${String(result.forward.mutations.length)} reversible mutations.`
        : `${result.diagnostic.code}: ${result.diagnostic.message}`,
    );
    setTrace(
      result.ok ? JSON.stringify(result.forward.trace) : "Cell rolled back.",
    );
    refresh();
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{APP_NAME}</p>
          <h1>Shifting Vaults</h1>
        </div>
        <div className="status" aria-label="Game status">
          <span>Round 3</span>
          <span>Human turn</span>
          <span>Threat 4 / 10</span>
        </div>
      </header>

      <section className="workspace" aria-label="Board game workspace">
        <aside className="panel script-panel">
          <h2>Script</h2>
          <p className="muted">Vertical slice · {LANGUAGE_VERSION}</p>
          <ol>
            <li className="active-cell">Move Mara toward Azure Gate</li>
            <li>Rotate a connected room</li>
            <li>Ivo searches Echo Hall</li>
          </ol>
        </aside>

        <section
          className="table-panel"
          aria-label="Shifting Vaults tabletop preview"
        >
          <p className="coachmark">
            This table will be driven by a reversible room program.
          </p>
          <div
            className="board"
            role="img"
            aria-label="Primitive top-down Shifting Vaults board"
          >
            {rooms.map((room, index) => (
              <div className={`room room-${String(index)}`} key={room}>
                <span>{room}</span>
                {room === "Azure Gate" ? (
                  <i className="gate" aria-hidden="true" />
                ) : null}
              </div>
            ))}
            <div className="room gatehouse">Gatehouse</div>
            <span className="token mara" aria-label="Mara explorer token">
              M
            </span>
            <span className="token ivo" aria-label="Ivo explorer token">
              I
            </span>
          </div>
          <p className="table-summary">
            Mara has one relic. Azure Gate is highlighted as the next objective.
          </p>
        </section>

        <aside className="panel inspector-panel">
          <h2>Chat & Inspector</h2>
          <p>Run one atomic cell, then inspect its deterministic state hash.</p>
          <label className="source-label" htmlFor="runtime-source">
            Reversible source cell
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
                setMessage(
                  runtime.undo()
                    ? "Applied inverse patch."
                    : "Nothing to undo.",
                );
                refresh();
              }}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => {
                setMessage(
                  runtime.redo()
                    ? "Applied forward patch."
                    : "Nothing to redo.",
                );
                refresh();
              }}
            >
              Redo
            </button>
          </div>
          <p className="runtime-message" role="status">
            {message}
          </p>
          <dl className="runtime-state">
            <dt>State hash</dt>
            <dd>{runtime.hash()}</dd>
            <dt>Global bindings</dt>
            <dd>{JSON.stringify(runtime.bindings())}</dd>
            <dt>Trace</dt>
            <dd>{trace}</dd>
          </dl>
        </aside>
      </section>

      <footer className="actionbar">
        <span>{isJudge ? "Judge route ready" : "Demo route ready"}</span>
        <div>
          <button type="button" disabled>
            Reset
          </button>
          <button type="button" disabled>
            Fresh copy
          </button>
        </div>
      </footer>
    </main>
  );
}
