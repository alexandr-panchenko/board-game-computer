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
          <p>Runtime and AI integration arrive in later milestones.</p>
          <h3>Legal actions</h3>
          <button type="button" disabled>
            Take control
          </button>
          <button type="button" disabled>
            Next replay step
          </button>
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
