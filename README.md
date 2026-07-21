# Board Game Computer

> **Working title.** Describe, play, and rewrite a board game in one shared
> room—people and GPT-5.6 operate the same safe, reversible tabletop language.

**Build Week status:** Milestone 6 is deployed and production-verified. The
repository now combines the reversible interpreter, complete deterministic
`Shifting Vaults`, server-only GPT-5.6 Designer and Luna paths, guided replay,
takeover, triggered live rule, real endings, and deterministic fallbacks.
Persistent collaboration is the active milestone.

## Live demo

- Main: <https://board-game-computer.sanocks.workers.dev/>
- Judge route: <https://board-game-computer.sanocks.workers.dev/judge>
- Current status: **M6 complete and production-verified; M7 persistent shared
  rooms in progress**

The deployed build proves the complete end-to-end sequence on desktop and
mobile, including a strict GPT-authored rule boundary, AI-seat selection,
budget guard, and labelled fallback.

## 60–90 second judge path

1. Open `/judge`. A polished `Shifting Vaults` table is already in progress;
   no login or API key is required.
2. Advance the guided replay. Each step highlights a program cell and the exact
   deterministic change it causes on the table.
3. Select **Take control now** and perform the highlighted **Move → azure-gate**.
4. Ask Luna to choose Ivo's move from the same registered action system.
5. Ask the Designer agent: “Whenever an explorer enters a blue gate, rotate the
   connected room clockwise.”
6. Watch the validated source cell appear, move to Clockwork Archive, re-enter
   Azure Gate, and see the new trigger rotate the connected room. Continue
   playing toward a real win or loss.

Expected result: the judge sees that the table is not an animation or an
unconstrained model. It is a deterministic program with reversible commands,
legal actions, live rule editing, replay, and multiplayer-ready ordering.

## Demo video

Public YouTube URL: `https://youtu.be/<video-id>`

Current status: **not recorded yet**. The final video must be shorter than three
minutes, include audio, and explain both Codex and GPT-5.6 usage.

## What Board Game Computer is

Board Game Computer is a cell-driven live programming environment for tabletop
play. A room is an ordered sequence of cells. Setup, objects, rules, player
actions, chat, and AI-authored changes all become cells in that sequence.

The client parses a familiar JavaScript-shaped language with Acorn and executes
an allowed subset in a custom TypeScript interpreter. Every cell records
forward and inverse mutations over a transactional store. That enables atomic
failure recovery, local undo/redo, optimistic multiplayer rollback, and cheap
rebase without replaying the whole room.

The first complete sample, **Shifting Vaults**, is a 10–15 minute original
adventure race with modular rotating rooms, movement points, relics, tactic
cards, a threat track, deterministic randomness, one human seat, and one AI
seat.

## Setup

Prerequisite: Bun 1.2.5 or a compatible newer 1.x release. A Cloudflare login
and OpenAI key are not required for the deterministic app shell or ordinary
validation.

```bash
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:5173/> or <http://localhost:5173/judge>. The Vite server
runs the Worker in `workerd`, so `/api/health` is available alongside the React
app.

The local app opens at the immutable guided replay and requires no model call
for its useful first state. When needed, copy `.env.example` to the already
ignored `.dev.vars` and set `OPENAI_API_KEY` there only. The deterministic demo
and all ordinary tests continue to work with `AI_ENABLED=false`.

## Tests and validation

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run test:workers
bun run test:e2e
bun run build
bun run secrets:check
bun run licenses:check
bun run validate
```

`bun run validate` executes every non-live check above. Playwright needs its
Chromium binary once per machine: `bunx playwright install chromium`. Live AI
tests are deliberately separate and opt-in.

See `docs/06-TEST-PLAN.md` for exact coverage, performance budgets, live-AI test
policy, and acceptance gates.

## Architecture at a glance

```text
Browser
├─ React application and semantic controls
├─ PixiJS renderer (replaceable adapter)
├─ custom vector geometry kernel
└─ RoomRuntime
   ├─ Acorn parser and AST validator
   ├─ reversible TypeScript AST interpreter
   ├─ transactional scopes/slots/heap
   ├─ forward and inverse mutation patches
   ├─ BDD/action/game framework
   ├─ deterministic PRNG and state hashing
   └─ optimistic pending stack and rebase

Cloudflare Worker
├─ HTTP/SSE endpoints
├─ OpenAI Responses API orchestration
└─ Durable Objects
   ├─ room cell ordering, storage, broadcast, reconnect
   └─ global AI budget guard
```

The server never executes room simulation. It stores and globally orders
source cells. Deterministic clients execute the same cells and compare state
hashes.

Detailed design: `docs/04-TECHNICAL-DESIGN.md`.

## GPT-5.6 usage

Board Game Computer uses the OpenAI Responses API from the Cloudflare Worker:

- `gpt-5.6` proposes Designer cells from natural-language requests;
- `gpt-5.6-luna` chooses one registered legal action for the AI player;
- strict function schemas wrap source and action proposals;
- candidate source is parsed, capability-checked, fuel-bounded, and executed
  speculatively before commit;
- diagnostics are returned for up to three repair attempts;
- API failure leaves the sample fully playable and exposes a clearly labelled
  example-rule fallback.

No OpenAI secret is shipped to the browser.

## Codex collaboration

The primary Codex build session must implement the repository milestone by
milestone using `CODEX_KICKOFF.md` and record its `/feedback` Session ID for the
submission. The README will be updated with concrete examples of where Codex
accelerated interpreter implementation, Cloudflare integration, testing,
rendering, and reliability work.

Do not submit generic claims. Link each claim to commits, files, test output, or
video timestamps in `docs/08-SUBMISSION-EVIDENCE.md`.

## Key human decisions

The product owner made these central decisions before implementation:

- a room is a live ordered program, not a collection of configuration files;
- people and agents use one command language with role-based capabilities;
- the language keeps JavaScript syntax but executes in a custom reversible AST
  interpreter;
- every cell is atomic and produces forward/inverse patches;
- the server sequences cells but does not simulate the game;
- multiplayer uses optimistic rollback/reapply without locking;
- top-down 2D and exact vector geometry replace 3D/physics;
- the sample must be a complete short game, not a toy animation;
- static AI-generated art is optional polish with deterministic primitives as
  fallback;
- no accounts, BYOK, anti-cheat, marketplace, or full GM role in Build Week.

See `docs/03-DECISION-LOG.md` for the complete record.

## Repository documents

- `JUDGING.md` — shortest reliable evaluation path.
- `STATUS.md` — milestone state and latest validation.
- `docs/01-PRODUCT-BRIEF.md` — frozen product and scope.
- `docs/04-TECHNICAL-DESIGN.md` — architecture and protocols.
- `docs/05-IMPLEMENTATION-PLAN.md` — autonomous build runbook.
- `docs/06-TEST-PLAN.md` — validation strategy.
- `docs/08-SUBMISSION-EVIDENCE.md` — claims-to-evidence matrix.
- `docs/09-SUBMISSION-COPY-DRAFT.md` — draft only; rewrite in the author's
  voice before submission.

## License and third-party notices

Project code is planned for release under the MIT License. See `LICENSE` and
`THIRD_PARTY_NOTICES.md`.

The sample game, names, text, and checked-in assets must be original. Do not use
commercial board-game names, rules text, logos, or art in the product, video,
or screenshots.
