# Board Game Computer test plan

Status: binding validation plan for the Prism Foundry replacement.

## Quality gate

Every release candidate must pass:

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
```

`bun run validate` runs this non-live matrix. Live OpenAI checks are opt-in and must never be an ordinary CI requirement.

## Runtime unit coverage

- Acorn parsing and source locations.
- Supported/unsupported AST validation by capability.
- lexical scopes, mutable and immutable bindings, closures, arrays, records, and interpreted functions.
- no `eval`, `Function`, imports, browser/network/time access, prototypes, or unbounded native escape.
- execution fuel and bounded collections.
- atomic failed-cell rollback.
- forward/inverse mutation symmetry and exact state hashes.
- deterministic RNG.
- retained patch undo/redo.
- pending-tail optimistic rollback, authoritative apply, revalidation, and rebase.

## Prism Foundry unit coverage

- two fresh 16-cell genesis executions converge.
- Program source equals the shipped genesis source in chronological order.
- genesis creates 23 finite tokens, 18 original cards, seeded 12-card deck remainder, six market cards, both mats, markers, Rulebook, House Rules, and legal options.
- Take Ruby + Sapphire moves exactly two physical tokens, passes the turn, and appends canonical source.
- payment applies permanent discounts, matching tokens, and Prism wilds correctly.
- purchase returns payment, moves the card to tableau, increments discount and Prestige, resolves ability/House Rule, refills deterministically, and passes/retains turn correctly.
- Prism and Echo behavior.
- Ruby resonance validation accepts only the supported declaration.
- Designer speculation restores the exact prior hash before commit.
- undo/redo restores purchase and refill exactly.
- a deterministic sequence of registered ordinary actions reaches at least 8 Prestige.
- victory empties ordinary legal options while Program/history remain.
- finite token and card-location invariants hold.

## AI boundary coverage

- strict Designer and Player schemas reject extra or malformed fields.
- context is bounded and sensitive-looking values are redacted.
- setup/rule source is prioritized within context limits.
- Designer repair receives parse/validation diagnostics and tries at most three times.
- no failed candidate commits.
- a changed base hash forces current-state revalidation.
- Luna can select only an offered opaque option ID that remains legal.
- model routing stays server-side: `gpt-5.6` Designer and `gpt-5.6-luna` Player.
- missing key or disabled AI returns an explicit unavailable result; deterministic browser fallback stays usable.
- timeout, cancellation, malformed tool output, room quotas, and global budgets remain bounded.

## Worker and Durable Object coverage

- health and static routes.
- room creation with `prism-foundry-v1` template.
- Designer/Player capability fragments and unauthorized rejection.
- executable-cell capability enforcement.
- one global sequence, idempotent command IDs, current-head requirement, and state-hash attestation.
- stale proposal returns authoritative tail for rebase and never appends.
- storage and WebSocket attachments survive eviction.
- reconnect returns the missing tail.
- state-hash mismatch triggers divergence recovery.
- immutable-prefix fork creates a separately capable child without mutating the parent.
- cell size, rate, room, connection, and origin limits.

## Desktop browser coverage

- player-centred product statement, objective, both mats, bank, market, current turn, full tabletop, and one clear next action visible in the 1440 × 900 first viewport.
- actual Pixi canvas initializes with no page-breaking console error.
- Advanced diagnostics exists and is collapsed.
- Ruby and Sapphire can be selected directly on the table and committed through one in-table confirmation.
- affordable cards expose visible contextual Buy; unaffordable cards remain inspectable and disabled.
- Ivo's mat shows thinking, Luna/fallback completes automatically, the cell appends, and Table Agent identifies `Ivo · Player`.
- Rulebook opens from the physical table and the old bottom How to Play grid is absent.
- Change a rule opens Table Agent without replacing the table; Ruby Resonance commits, House Rules updates, and the Ruby purchase visibly grants a Prism.
- Program shows exactly 16 setup cells before play, full syntax-highlighted source, subtle chronological boundaries, collapsed technical details, and one next-cell caret.
- **View source** opens the exact latest cell beside the table.
- human-readable legal actions contain no internal IDs.
- keyboard focus outline is visible.
- default copy excludes `One chronological executable history`, `Genesis is not hidden setup`, `Acorn parses`, `speculatively`, `inverse patch`, `state hash`, and internal IDs.
- mocked live hero path: Mara → automatic Luna → Table Agent Designer → Ruby Resonance trigger → exact Program cell → undo/redo.
- AI-disabled fallback completes the same product proof truthfully.
- Local game is labelled; Create shared room produces `/room/<id>`, opens Share, retains a Player invite, joins as Player without retaining the fragment, and preserves two-client convergence, reconnect, prefix rollback/forward, and fork.
- real deterministic 8-Prestige ending is covered by runtime execution and manually verified on the rendered table.

## Mobile browser coverage

- Pixel 7 first viewport is table-first and has no horizontal overflow.
- fixed controls reach Table Agent, Program, Rulebook, and Share drawers directly without losing table context.
- touch targets are at least 44 px.
- Program source remains readable and Table Agent controls do not require traversing unrelated content.
- complete hero and fallback behavior run in the same responsive application.

## Manual product review

At 1440 × 900, 1280 × 800, and Pixel 7, a clean viewer gets five seconds to answer:

1. What is this?
2. What is the goal?
3. What should I do next?
4. Where can AI change the rules?
5. Which character is mine?

Failure of any answer blocks release even when automation is green. Review the complete physical table, Program genesis legibility, payment/ability animation clarity, mobile tab reachability, focus, copy, and labelled fallback honesty.

## Deployment verification

After deployment:

1. Verify exact deployed commit and CI/deploy run.
2. Open `/` and `/judge` in clean desktop and mobile contexts.
3. Run automatic live GPT-5.6 Luna and the Table Agent's GPT-5.6 Designer path.
4. Run AI-disabled fallback.
5. Create two clean shared clients; verify convergence, reconnect, rollback/forward, and fork.
6. Run production smoke, secret scan, and license scan.
7. Capture the required screenshots.

M9 and final tagging remain blocked on explicit owner product approval and owner-only submission artifacts, not on automated test completion alone.
