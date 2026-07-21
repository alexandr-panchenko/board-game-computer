# Decision log

Status values: `accepted`, `rejected`, `deferred`, `superseded`.

| ID | Date | Status | Decision | Rationale and consequence |
|---|---|---|---|---|
| D-001 | 2026-07-21 | accepted | Submit in **Apps for Your Life**. | The product is a consumer creativity/playtesting experience. |
| D-002 | 2026-07-21 | accepted | Primary audience is hobbyist tabletop creators and playing groups. | Keeps the problem concrete without requiring professional publishing workflows. |
| D-003 | 2026-07-21 | accepted | Creation, play, and rule modification are one continuous room loop. | Avoids three disconnected products and makes the hero path coherent. |
| D-004 | 2026-07-21 | accepted | A room is an ordered live program of cells. | Setup, rules, actions, chat, and later changes share one source of truth. |
| D-005 | 2026-07-21 | accepted | Runtime state is a materialized result of cells, not an independent configuration authority. | Exporting or forking a program reproduces the room. |
| D-006 | 2026-07-21 | accepted | The language uses familiar JavaScript syntax and selected JavaScript semantics. | Agents and technical users can understand it without learning a novel data-only DSL. |
| D-007 | 2026-07-21 | rejected | Native `eval` or sequential native scripts. | Native lexical state is not reversibly controllable and makes optimistic rollback/rebase fragile. |
| D-008 | 2026-07-21 | accepted | Acorn parses source; a custom TypeScript interpreter executes the allowed subset. | Preserves familiar syntax while controlling values, fuel, capabilities, and rollback. |
| D-009 | 2026-07-21 | accepted | Every executable cell is atomic. | Partial state cannot leak from failed source or failed triggers. |
| D-010 | 2026-07-21 | accepted | Every committed cell records forward and inverse mutations. | Enables undo/redo, time travel, and cheap rollback of local pending operations. |
| D-011 | 2026-07-21 | accepted | Multiplayer rebase undoes only the local pending stack, applies authoritative cells, then re-executes pending cells. | Frequent moves do not replay the entire room or recreate execution contexts. |
| D-012 | 2026-07-21 | deferred | General operational transformation for arbitrary Designer code. | Conflicting semantic edits may be rejected/repairable; specialized transforms can be added later for actions. |
| D-013 | 2026-07-21 | rejected | Locking as the base synchronization mechanism. | Locks add failure modes and do not replace deterministic ordering/rebase. |
| D-014 | 2026-07-21 | accepted | Cloudflare Durable Object assigns monotonic global sequence numbers per room. | One room sequencer makes Lamport clocks unnecessary in the first implementation. |
| D-015 | 2026-07-21 | accepted | The server stores and broadcasts cells but never executes game simulation. | Keeps Cloudflare responsibilities simple and respects client-side runtime design. |
| D-016 | 2026-07-21 | accepted | Clients compare deterministic state hashes after committed cells. | Detects divergence even though the server cannot determine the correct simulation state. |
| D-017 | 2026-07-21 | accepted | Players use registered actions; Designer may use the general allowed language. | Finite legal choices support humans and AI without creating a second engine. |
| D-018 | 2026-07-21 | accepted | GPT-5.6 Designer returns candidate source through a strict tool schema. | Structured envelope plus interpreter validation prevents direct state mutation. |
| D-019 | 2026-07-21 | accepted | AI player chooses from materialized legal registered actions. | The model cannot invent a state patch or see an unrestricted mutation tool. |
| D-020 | 2026-07-21 | accepted | Up to three hidden repair attempts for invalid generated source. | Diagnostics help the model recover while invalid attempts stay out of the room log. |
| D-021 | 2026-07-21 | accepted | Deterministic fallback remains fully playable and is explicitly labelled. | Judge path survives API failure without pretending static content is live AI. |
| D-022 | 2026-07-21 | accepted | BDD-style `Scenario`, `Given`, `When`, `Then`, `Invariant`, and `Action` are framework primitives in the main language. | Creates readable triggers, actions, tests, and agent affordances without a second parser. |
| D-023 | 2026-07-21 | rejected | Separate free-form Gherkin grammar in Build Week. | Duplicates parsing and diagnostics work without strengthening the hero path. |
| D-024 | 2026-07-21 | accepted | Top-down 2D rendering. | Faster, clearer, and more mobile-friendly than isometric or 3D. |
| D-025 | 2026-07-21 | accepted | PixiJS is a replaceable renderer adapter, not the geometry/game authority. | Retains convenient sprite rendering without coupling semantics to the library. |
| D-026 | 2026-07-21 | rejected | Paper.js. | Unnecessary for the selected geometry and rendering boundaries. |
| D-027 | 2026-07-21 | accepted | Custom TypeScript geometry supports line, cubic Bézier, and arc path segments. | Enables exact/tolerance-based zone relations without canvas-pixel hit testing. |
| D-028 | 2026-07-21 | permanently rejected | Physics engine. | Tabletop rules need semantic positions and intersections, not physical simulation. |
| D-029 | 2026-07-21 | accepted | Drag preview is ephemeral; drop creates one canonical action cell. | Keeps the room program meaningful and reduces command volume. |
| D-030 | 2026-07-21 | accepted | Time travel uses local forward/inverse patches. | Normal history inspection does not change the server room. |
| D-031 | 2026-07-21 | accepted | Persistent continuation from the past creates a fork. | Original room remains append-only while history remains useful. |
| D-032 | 2026-07-21 | accepted | Separate Designer and Player capability links; no accounts. | Supports sharing and role UI without registration. |
| D-033 | 2026-07-21 | accepted | Cooperative trust model; full log may reach clients. | Build Week is for playtesting/friends, not money games or adversarial secrecy. |
| D-034 | 2026-07-21 | deferred | Enforced private hands and redacted source logs. | Metadata can anticipate visibility, but sample information is open. |
| D-035 | 2026-07-21 | accepted | Main URL and `/judge` open an immutable template and create fresh personal rooms on takeover. | Prevents visitors from corrupting a shared demo. |
| D-036 | 2026-07-21 | accepted | No blocking onboarding modal. | Guided replay and coach marks provide immediate understanding. |
| D-037 | 2026-07-21 | accepted | Responsive desktop and mobile are required. | Judge device is unknown; mobile inability would be a product failure. |
| D-038 | 2026-07-21 | accepted | English-only UI/submission for Build Week. | Avoids localization scope and meets submission requirements. |
| D-039 | 2026-07-21 | accepted | Static AI-generated sample art is a late supporting feature with primitive fallback. | Adds visual impact without making image calls a runtime dependency. |
| D-040 | 2026-07-21 | rejected | In-app audio for MVP. | Weak audio can harm experience; video audio remains mandatory. |
| D-041 | 2026-07-21 | accepted | First sample is a complete original 10–15 minute game. | Proves that the engine supports real play, not only a scripted effect. |
| D-042 | 2026-07-21 | accepted | Working sample theme is `Shifting Vaults`, a modular adventure race. | Demonstrates tiles, paths, rotation, cards, randomization, triggers, and an ending. |
| D-043 | 2026-07-21 | accepted | Commercial game names, copied rules, trademarks, and assets are excluded. | Reduces IP risk and keeps evidence original. |
| D-044 | 2026-07-21 | accepted | Bun is the local package manager/task runner. | Matches owner preference while Cloudflare remains the production runtime. |
| D-045 | 2026-07-21 | accepted | React + TypeScript + Cloudflare Vite plugin. | Provides a familiar, well-supported full-stack Cloudflare development path. |
| D-046 | 2026-07-21 | accepted | SQLite-backed Durable Object per room plus a singleton budget guard. | Room-local ordering/storage and central API budget enforcement are simple and testable. |
| D-047 | 2026-07-21 | accepted | Hibernatable WebSockets for shared rooms. | Preserves connections while letting inactive Durable Objects sleep. |
| D-048 | 2026-07-21 | accepted | OpenAI Responses API; `gpt-5.6` for Designer and `gpt-5.6-luna` for frequent AI turns. | Uses current GPT-5.6 family with quality/cost routing. |
| D-049 | 2026-07-21 | accepted | OpenAI key is server-side only; browser never calls OpenAI directly. | Prevents key exposure and enables budget/rate enforcement. |
| D-050 | 2026-07-21 | accepted | `/judge` and main route require no login, BYOK, or CAPTCHA. | Removes judging friction and meets free testing requirements. |
| D-051 | 2026-07-21 | accepted | Baseline semantic controls and text state accompany the canvas. | Supports browser automation, keyboard use, and understandable evaluation. |
| D-052 | 2026-07-21 | deferred | Full block editor inspired by Droplet. | Readable syntax highlighting is sufficient for Build Week; block round-trip is large. |
| D-053 | 2026-07-21 | deferred | Game Master role, mass AI simulations, imports, gallery, marketplace, voice, and runtime art. | Explicit kill-list items until after submission. |
| D-054 | 2026-07-21 | accepted | Prior prototype is disclosed, but no old code/assets are imported by default. | Protects Build Week eligibility and makes new work auditable. |
| D-055 | 2026-07-21 | accepted | Feature cut line is after the complete single-room M6 judge path. | Collaboration polish may be cut before weakening deployment, interpreter, GPT validation, or complete-game proof. |
| D-056 | 2026-07-21 | accepted | Each client keeps at most one canonical proposal in flight; the server appends executable cells only when their base equals the current room head. | Later optimistic actions stay queued locally, while stale operations rebase before they can enter the canonical log. |

## Architecture changes that require a new accepted decision

- replacing the interpreter with native execution;
- moving simulation to the server;
- changing the source of truth away from cells;
- removing inverse patches or optimistic rollback;
- changing the sample game or hero rule;
- introducing accounts or required BYOK;
- adding a feature from the kill list before release.
