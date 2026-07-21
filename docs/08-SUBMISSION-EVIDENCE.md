# Submission evidence matrix

Do not replace `PENDING` with `VERIFIED` until the exact artifact exists and has
been personally checked against the tagged production build. General claims are
not evidence.

## Release identifiers

- Production URL: `PENDING`
- Judge URL: `PENDING`
- Repository URL: `PENDING`
- Public video URL: `PENDING`
- Submission commit: `PENDING`
- Submission tag: `build-week-submission` — `PENDING`
- Primary Codex `/feedback` Session ID: store securely and enter in Devpost —
  `PENDING`

## Milestone validation log

### M1 — Repository and reproducible environment

- Date: 2026-07-21
- Frozen install: `bun install --frozen-lockfile` checked 238 installs across
  315 packages with no changes.
- Full non-live validation: `bun run validate` passed formatting, ESLint,
  strict TypeScript, one unit test, one Workers-runtime test, two Playwright
  tests (desktop and mobile), production build, tracked/build-output secret
  scan, and 26-direct-dependency license scan.
- CI workflow: `.github/workflows/validate.yml`.
- Smoke tests: `tests/unit/versions.test.ts`,
  `tests/workers/health.test.ts`, and `tests/e2e/judge-shell.spec.ts`.
- Initial implementation tree: `src/app`, `src/shared`, `src/worker`,
  `scripts`, and `tests/{unit,workers,e2e}`.
- Implementation commit: `9e78db4`.

### M2 — Deployable vertical slice

- Date: 2026-07-21
- Production URL: `https://board-game-computer.sanocks.workers.dev/`.
- Judge URL: `https://board-game-computer.sanocks.workers.dev/judge`.
- Implementation commit: `7d7f276`.
- Verified GitHub Actions deployment version:
  `0d70d2dd-8cf4-4ec0-841e-5fcc6f19e59d`; deployment list showed 100% traffic
  and `/api/version` reported commit `1ccf238502336a60735b6c61006d1e312745a81b`.
- GitHub Actions run:
  `https://github.com/alexandr-panchenko/board-game-computer/actions/runs/29801591144`;
  both `validate` and `deploy` jobs completed successfully.
- Verified production responses: `/` 200, `/judge` 200, `/api/health` returned
  `vertical-slice`, `/api/version` reported the deployed commit, and
  `/api/room-health` confirmed `RoomObject` with SQLite storage.
- Production Playwright: desktop and mobile projects both passed
  `production shell opens the responsive judge route` against the public URL.
- Local evidence screenshots:
  `evidence/local/m2/desktop-judge.png` and
  `evidence/local/m2/mobile-judge.png` (gitignored pending curated evidence).
- Failure/fix evidence: the first `/judge` request exposed a missing Assets
  binding as Cloudflare error 1101; a Worker tail identified `env.ASSETS` as
  undefined, `wrangler.jsonc` was corrected, full validation reran, and the
  repaired production route returned 200.

### M3 — Reversible interpreter core

- Date: 2026-07-21.
- Runtime architecture: `src/runtime/{parser,validator,interpreter,store,sync}`
  implements Acorn parsing and cached source spans, a capability-aware AST
  allowlist, custom serializable values, transactional mutations, closures,
  deterministic canonical hashing, exact forward/inverse patches, bounded
  execution, and pending-tail rebase without native `eval`.
- Focused validation passed: 12 runtime tests, 1 rollback test, 3 rebase tests,
  and 1 determinism test. Covered exact undo/redo hashes, allocation and heap
  rollback, fuel exhaustion, single-evaluation assignment semantics,
  independent-runtime convergence, one-in-flight proposal ordering, and
  authoritative rebase conflicts.
- Full `bun run validate` passed: 15 unit tests, 2 Workers tests, 4 Playwright
  tests across desktop/mobile, production build, 69-file-plus-bundle secret
  scan, and 27-direct-dependency license scan.
- Synthetic replay benchmark: 500 increment cells executed in 75.61 ms and
  produced final state hash `c8c7e146d750ee99` on the development machine,
  below the provisional 3,000 ms desktop gate.
- Runtime inspector evidence: `evidence/local/m3-runtime-inspector.png`
  (gitignored local artifact); desktop and mobile Playwright both verified
  commit, inverse-patch undo, and forward-patch redo through `/judge`.
- Implementation commit: `f902c0a` (pushed to `origin/main`).

### M4 — Table framework and complete deterministic sample

- Date: 2026-07-21.
- Framework architecture: `src/runtime/framework` stores registries, PRNG
  state, actions, scenarios, invariants, events, turn state, and results inside
  `TransactionalStore`; human, fallback-AI, undo, redo, and drag all use the
  same materialized action path.
- Geometry architecture: `src/geometry` implements renderer-independent line,
  cubic Bézier, SVG-style arc, transform, bounds, containment, intersection,
  overlap, nearest-point, z-hit, and rotation-aware room topology functions.
  Four deterministic geometry tests passed without canvas pixel reads.
- Sample architecture: `src/sample/shifting-vaults` encodes seven rooms, two
  explorers, four relic/two hazard tokens, eight tactic cards, deck refill,
  Threat/round pressure, all five registered actions, conservation invariants,
  both endings, fallback policy, blue-gate Scenario, replay cells, and a real
  action-replayed judge checkpoint.
- Seed and hashes: seed `judge-vault-2026-4`; fresh setup
  `152507e7fa707fcf`; Round 3 checkpoint `f8f507cc16eee333`; explorer victory in
  Round 5 `fc5ec63f53cae28c`; vault collapse in Round 9 `7a7aa7605ab44473`.
- Focused validation passed: 6 framework tests, 4 geometry tests, and 10
  Shifting Vaults tests. Coverage includes PRNG rollback, FIFO/scenario order,
  trigger cap, invariant rollback, all tactics, reshuffle, fallback AI,
  reversible hero rule and occupied skip, action-only victory, and collapse.
- Full `bun run validate` passed: 36 unit tests, 2 Workers tests, 12 Playwright
  tests across desktop/mobile, production build, 90-file-plus-bundle secret
  scan, and 27-direct-dependency license scan.
- Browser gates passed on desktop and mobile: complete deterministic game,
  44px semantic controls, Pixi projection, canvas drag producing exactly one
  legal move cell, exact game undo/redo, Reset, and Fresh copy.
- Local visual evidence: `evidence/local/m4-desktop-gameplay.png` and
  `evidence/local/m4-mobile-gameplay.png` (gitignored local artifacts).
- Implementation commit: `e5732aab6454c13994c6324c4734ca0739b3703c`
  (pushed to `origin/main`).
- GitHub Actions run:
  `https://github.com/alexandr-panchenko/board-game-computer/actions/runs/29804977568`;
  both `validate` and `deploy` jobs completed successfully.
- Production `/api/version` reported commit
  `e5732aab6454c13994c6324c4734ca0739b3703c`; `/api/health` and
  `/api/room-health` passed, and `/judge` returned HTTP 200.
- Production Playwright passed six desktop/mobile checks covering the public
  shell, a complete deterministic explorer victory, and touch-sized semantic
  game controls.

### M5 — GPT-5.6 Designer and AI-player integration

- Date: 2026-07-21.
- Integration boundary: `src/worker/ai` uses the OpenAI Responses API only in
  Worker code. The Designer defaults to `gpt-5.6` with medium reasoning; the AI
  player defaults to `gpt-5.6-luna` with low reasoning. Both use forced strict
  function tools and `parallel_tool_calls: false`.
- Official guidance checked during implementation: GPT-5.6 model guidance,
  Responses function calling, strict schemas, structured output, and explicit
  reasoning configuration at `https://developers.openai.com/api/docs/`.
- Safety boundary: Zod validates every HTTP/tool envelope; the context builder
  has a 48,000-character ceiling and redaction; source candidates parse,
  validate, speculatively execute, and roll back to the exact prior hash before
  commit. Failed candidates never enter the visible cell list.
- Repair and action boundary: at most three total Designer attempts receive
  structured diagnostics. The player sees only stable opaque option IDs,
  labels, and consequences; literal arguments remain local and the chosen
  option is revalidated immediately before `performAction`.
- Cost/reliability boundary: SQLite `BudgetObject` enforces global daily request
  and estimated-token limits plus per-room hourly limits. Requests have a
  20-second timeout/cancellation path. `AI_ENABLED=false`, timeout, malformed
  output, unknown/stale action, and budget failure preserve labelled
  deterministic fallbacks.
- Production secret readiness: Cloudflare lists `OPENAI_API_KEY` as a
  `secret_text` binding. The value was never printed or written to tracked
  files. The final client bundle contains no key marker or key-shaped value.
- Bounded opt-in live smoke passed two calls: Designer resolved to
  `gpt-5.6-sol`, used 201 input/111 output tokens, and its source passed local
  validation; Player used `gpt-5.6-luna`, used 164 input/40 output tokens, and
  selected one of two offered opaque options.
- Full `bun run validate` passed 46 unit tests, 8 Workers tests, 16 Playwright
  checks across desktop/mobile, production build, 104-file-plus-build-output
  secret scan, and 27-direct-dependency license scan after the final
  speculative-execution review.
- Local visual evidence: `evidence/local/m5-designer-desktop.png` and
  `evidence/local/m5-designer-mobile.png` (gitignored local artifacts).
- Implementation commit: `aab81ed6bd686a4492ca272f01abfe97a8fbcd8d`
  (pushed to `origin/main`).
- GitHub Actions run:
  `https://github.com/alexandr-panchenko/board-game-computer/actions/runs/29806911715`;
  both `validate` and `deploy` jobs completed successfully.
- Production `/api/version` reported the exact implementation commit;
  `/api/health`, `/api/room-health`, and `/api/ai/status` passed. AI status
  reported enabled Designer `gpt-5.6`, Player `gpt-5.6-luna`, and fallback
  availability without exposing secret material.
- Production Playwright passed six desktop/mobile checks covering shell,
  labelled fallback, and the locally validated mocked-AI paths.
- Bounded production Designer verification streamed accepted/budget/generating
  progress and a strict `gpt-5.6-sol` canonical blue-gate Scenario in 2,804 ms.
  Production Luna selected offered option `opaque-search` in 1,357 ms; no
  literal action arguments or credentials were sent to the model.

## Milestone 6 — Complete hero and judge flow

- Date: 2026-07-21.
- Immutable replay fixture: `createGuidedReplayStep` derives steps 0–3 from
  bundled sample data; step 3 exactly matches the curated Round 3 checkpoint.
- Product path: replay advances source, ordered trace, focus, and tabletop
  together; takeover commits a registered human move; Luna or its labelled
  fallback selects a registered AI action; Designer or its labelled example
  commits the blue-gate Scenario; leaving and re-entering Azure Gate fires the
  real Scenario trace and rotates the connected room.
- Recovery controls: **Return to demo checkpoint**, **Replay from start**, and
  **Fresh copy** reconstruct their states from immutable data. `/` and `/judge`
  expose the same guided template.
- First paint test intercepts all `/api/ai/` requests and proves zero requests
  occur before the useful table and replay UI appear.
- Full `bun run validate` passed 46 unit tests, 8 Worker tests, and 24
  Playwright checks across desktop/mobile, followed by production build,
  103-file-plus-build-output secret scan, and 27-direct-dependency license scan.
- The mocked desktop/mobile hero path completes in under 90 seconds. Separate
  desktop/mobile tests complete the same path with AI disabled and the labelled
  example rule, and deterministic tests retain both real escape and collapse
  endings.
- Local visual review passed at
  `evidence/local/m6-guided-desktop.png` and
  `evidence/local/m6-guided-mobile.png` (gitignored local artifacts).
- Implementation commit: `405fe3a733342a402932fd4528207fbd043a8d03`
  (pushed to `origin/main`).
- GitHub Actions run:
  `https://github.com/alexandr-panchenko/board-game-computer/actions/runs/29808226706`;
  both `validate` and `deploy` jobs completed successfully.
- Production `/api/version` reported the exact implementation commit;
  `/api/health`, `/api/room-health`, and `/api/ai/status` passed. AI status
  reported enabled Designer `gpt-5.6`, Player `gpt-5.6-luna`, and labelled
  fallback availability without exposing secret material.
- Ten production Playwright checks passed across desktop/mobile: useful shell
  before AI, equivalent `/`, mocked complete hero flow, reset/replay/fresh, and
  AI-disabled fallback/example completion.
- A bounded live production browser run used one Luna request and one Designer
  request, completed the literal path in 9,764 ms, and ended with
  `entity-entered-zone → scenario: Blue gate rotates its linked room →
  room-rotated`. The final state remained playable at Round 4, Threat 5.
- Production visual evidence:
  `evidence/local/m6-production-live-complete.png` (gitignored local artifact).

## Milestone 7 — Persistent shared rooms and reversible rebase

- Date: 2026-07-21.
- Durable Object boundary: SQLite stores room metadata, monotonic cells,
  idempotency keys, head sequence/hash attestations, parent prefix metadata,
  and only SHA-256 capability hashes. Raw Designer/Player secrets remain URL
  fragments and in browser session state; they are never rendered or logged.
- Ordering boundary: executable proposals commit only when `baseSeq` and
  `baseStateHash` match the current head. Duplicate `commandId` returns its one
  existing commit; stale proposals return the missing tail and append nothing.
  Action-kind source is always checked with the restricted Player validator,
  including for Designer capabilities.
- Realtime boundary: Hibernatable WebSockets retain joined client/role/sequence
  attachments, broadcast one global order, serve reconnect tails, and compare
  state-hash reports. A Worker test evicts the live Durable Object, then proves
  both its attachment and committed cell remain available.
- Client boundary: later optimistic transactions remain visible but queued
  behind one in-flight proposal. Rebase applies pending inverse patches,
  authoritative cells, then only the short pending tail; execution-count tests
  prove committed history is not replayed. Irreconcilable actions become a
  visible conflict, while hash divergence triggers exceptional full-prefix
  recovery.
- Timeline/fork: previous, next, and return-live apply retained patches.
  **Fork from here** copies only the selected canonical prefix into a separately
  capable child Durable Object and leaves the parent head unchanged.
- Exact M7 command matrix passed: 5 rebase unit checks, 5 room Worker checks,
  4 two-client desktop/mobile checks, 2 reconnect checks, and 2 fork checks.
  Concurrent same-entity proposals commit one global winner, reject the stale
  base, and converge both clients to the same hash.
- Full `bun run validate` passed 49 unit tests, 13 Worker tests, and 32
  Playwright checks across desktop/mobile, followed by production build,
  107-file-plus-build-output secret scan, and 27-direct-dependency license scan.
- Local visual review passed at `evidence/local/m7-shared-desktop.png` and
  `evidence/local/m7-shared-mobile.png` (gitignored local artifacts); neither
  image contains a capability secret.
- Implementation commit: `d9ebcda5d5f2c6c4b3745a441ed14d7396b204f2`
  (pushed to `origin/main`).
- GitHub Actions run:
  `https://github.com/alexandr-panchenko/board-game-computer/actions/runs/29810660286`;
  both `validate` and `deploy` jobs completed successfully.
- Production `/api/version` reported the exact implementation commit;
  `/api/health` and SQLite `/api/room-health` passed.
- Production parent room ID `0198546d-0a38-41e2-9540-d4a4045f045b` joined a
  Designer desktop and Player mobile browser context. One registered move
  committed at sequence 1 and both converged to state hash
  `3c6aed5f00e52d55`; Player reload recovered sequence 1 and the same hash.
- Fork room ID `fcf7d71c-7d63-4e48-a0b6-46167fa98acf` was created from prefix
  0 with new capabilities. Returning the parent live restored its sequence-1
  hash, proving the parent remained unchanged. No raw capability URL was logged
  or recorded.
- Production visual evidence:
  `evidence/local/m7-production-designer.png` and
  `evidence/local/m7-production-player-mobile.png` (gitignored local artifacts,
  visually reviewed without capability text).

## M8 reliability and security evidence

- M8 implementation hardens AI cancellation/retry, fatal UI recovery,
  canonical divergence reconstruction, same-origin WebSockets, CSP and browser
  headers, malformed/body/cell/chat/room/connection/rate limits, and exact
  post-deploy smoke verification.
- Focused local gates passed on 2026-07-21: 50 unit tests and 14 Worker tests.
  The complete `AI_ENABLED=false bun run test:e2e` matrix passed 36 desktop and
  mobile checks; the required mobile-only rerun passed all 18 checks. Both
  include cancellation, fallback completion without console-breaking errors,
  two-client convergence, reconnect, and persistent fork.
- Static generated art was cut under the documented M8 fallback because
  primitive visuals are original, deterministic, already coherent, and carry
  no loading or provenance risk. No generated asset claim is made.
- Implementation commit `51dc131f0c86b972690cdc291d0a7b4489fa5a2e`
  passed GitHub Actions validation in run
  `https://github.com/alexandr-panchenko/board-game-computer/actions/runs/29812767599`.
  Cloudflare deployment succeeded as version
  `9ab618e8-5623-4687-8145-f9f740b97847`; the job's first smoke correctly
  failed because it still targeted the retired workers.dev host. The canonical
  apex immediately passed exact-commit and security-header smoke.
- The documented rollback exercise deployed M7 version
  `e9b7bc22-dec6-4787-9b73-46ce0d70ecf6` at 100%. After edge propagation,
  `https://boardgamecomputer.com/api/version` reported exact M7 commit
  `d9ebcda5d5f2c6c4b3745a441ed14d7396b204f2` and `/judge` returned 200. M8
  version `9ab618e8-5623-4687-8145-f9f740b97847` was then restored to 100%; the
  apex reported exact commit `51dc131f0c86b972690cdc291d0a7b4489fa5a2e`
  with CSP, HSTS, permissions, referrer, content-type, and frame headers.
- The full production Playwright matrix passed 36/36 against the apex across
  clean desktop and Pixel 7 contexts, including cancellation, fallback with no
  console-breaking errors, persistent convergence/rebase/reconnect/fork, and
  both real endings. Visually reviewed gitignored artifacts are
  `evidence/local/m8-production-desktop.png`,
  `evidence/local/m8-production-mobile.png`, and
  `evidence/local/m8-production-budget-fallback.png`; none displays a room
  capability or secret.
- Follow-up commit `fb794ec7c2d5079bb3fcc456e558d37fce06ffc4`
  deployed as Cloudflare version `67a8c6bd-12ed-463d-ae8b-236b07788708` after
  another clean CI validation. Its immediate smoke raced edge propagation; the
  apex reported the exact follow-up commit seconds later. The smoke runner now
  keeps every assertion but retries for a bounded 30-second propagation window.
- M8 final production gate commit
  `b1a270de1adc8835c24a39e09e574d524e4c2030` passed both jobs in GitHub
  Actions run
  `https://github.com/alexandr-panchenko/board-game-computer/actions/runs/29814603946`.
  Cloudflare version `bd58ef18-6ffa-4fe3-b45b-cfc5ffc1c574` is at 100%; the
  CI exact-version/security smoke and a separate apex smoke both passed.

## Requirements and judging evidence

| Status | Requirement / criterion | Claim to verify | Exact evidence required | URL/file/video timestamp | Verification method |
|---|---|---|---|---|---|
| PENDING | Working project | Production app consistently loads and functions as described | Clean-browser production E2E result, health endpoint, screenshot | `<prod>/`, `<prod>/api/health`, artifact path | Open incognito and run smoke test |
| PENDING | Apps for Your Life category | Product serves consumer creativity/playtesting | Product brief plus working first screen and Devpost category screenshot | `docs/01-PRODUCT-BRIEF.md`, Devpost screenshot | Compare category wording to demo |
| PENDING | New/meaningful Build Week work | Repository implementation is new and prior exploration is disclosed | Initial/final commit history, Codex session dates, disclosure file | `docs/11-PREEXISTING-WORK-DISCLOSURE.md`, Git log | Audit dates and reused files |
| PENDING | Codex use | Primary Codex session built majority of core functionality | `/feedback` Session ID, commit history, README concrete examples | Session ID in form; README section; commits | Match session work to core files |
| PENDING | GPT-5.6 use | GPT-5.6 authors a validated room cell and AI player chooses a legal action | Integration files, live trace, committed cell, video timestamps | `src/worker/ai/*`, video `mm:ss` | Inspect code and run live path |
| PENDING | Free testing access | Judge can use app without payment | Incognito path recording | `<prod>/judge`, video timestamp | No account/payment prompt |
| PENDING | No login / BYOK | Judge path needs no registration or user key | JUDGING steps and clean-browser screenshot | `JUDGING.md`, screenshot | Follow instructions literally |
| PENDING | Public demo video | Video is public YouTube, under three minutes, with audio | YouTube page and duration | `<youtube-url>` | Incognito playback |
| PENDING | Video explains Codex and GPT-5.6 | Audio explicitly covers both | Transcript/timestamps | Video `mm:ss–mm:ss` | Listen and compare transcript |
| PENDING | Repository access/license | Repo is public with MIT or organizer access is granted | Repo settings, LICENSE | `<repo-url>`, `LICENSE` | Open unauthenticated or verify invites |
| PENDING | README completeness | Setup, tests, sample, Codex, human decisions, GPT usage are concrete | Final README sections | `README.md` | Fresh-reader audit |
| PENDING | `/feedback` Session ID | Correct primary project thread ID entered | Devpost form screenshot/private record | Devpost submission | Human verification |
| PENDING | English materials | UI, README, testing instructions, copy, and video are English | Screenshots/files/transcript | Multiple | Manual audit |
| PENDING | Original/IP-safe assets | No commercial game trademarks, copied rules, or unlicensed art/music | Asset manifest, notices, video audio review | `THIRD_PARTY_NOTICES.md`, asset manifest | License/provenance audit |
| PENDING | Technological Implementation | Custom reversible interpreter is real and non-trivial | Source files, rollback/rebase tests, architecture section | `src/runtime/**`, test output, video timestamp | Code review and execute tests |
| PENDING | Reversible cells | Every successful cell records forward/inverse patches | Patch tests and runtime inspector | test names/output, screenshot | Verify hash round-trip |
| PENDING | Atomic failure | Failed source leaves exact pre-cell state | Failure/hash test output | test artifact | Run targeted test |
| PENDING | No full-room replay in rebase | Ordinary multiplayer rebase touches only local pending tail | Instrumented test and two-client trace | test output, video timestamp | Assert committed-history execute count is zero |
| PENDING | Determinism | Independent clients/runtimes converge to same hash | convergence test output | test artifact | Run twice/two contexts |
| PENDING | Complete game | Shifting Vaults can be played to real victory and collapse | E2E victory/loss traces and manual play recording | test artifacts, video/screenshot | Start fresh and finish |
| PENDING | Design coherence | First screen, replay, takeover, agent change form one clear experience | 90-second recording and first-impression review | video `00:00–01:30` | External review prompt |
| PENDING | First-screen value | Working table appears before AI call | performance trace/screenshot | `<prod>/judge`, video `00:00` | Disable network/OpenAI and load |
| PENDING | Guided causality | Highlighted cell and trace match visible table change | screenshot/video and E2E assertions | video `mm:ss` | Compare source ID/trace/entity |
| PENDING | Human legal action | Direct manipulation/action list commits valid Player cell | E2E trace | video `mm:ss`, test output | Verify action source and state |
| PENDING | AI legal action | Model/fallback chooses only a materialized legal action | AI fixture/live trace | video `mm:ss`, logs/test | Compare chosen ID to option list |
| PENDING | Live rule change | Blue-gate Scenario is model-authored, validated, committed, and fires | source cell screenshot, trace, resulting rotation | video `mm:ss`, room export | Inspect committed source and effect |
| PENDING | Repair loop | Invalid model output can repair without polluting log | mocked repair test and attempt telemetry | test output | Count committed vs failed candidates |
| PENDING | AI fallback | App remains playable with AI disabled | AI-disabled E2E and labelled UI screenshot | test output, screenshot | Set `AI_ENABLED=false` |
| PENDING | Reset/fresh copy | Judge path can be reproduced | repeated E2E and new room URL | JUDGING, test output | Run twice in clean state |
| PENDING | Mobile support | Minimum mobile viewport completes judge path | Playwright mobile trace and real-device screenshot | artifact paths | Execute full path |
| PENDING | Semantic controls | Key status/actions exist outside canvas | DOM snapshot/accessibility scan/manual | test output, screenshot | Keyboard/browser-agent check |
| PENDING | Shared room | Two clients order cells, reconnect, and converge | two-browser E2E/video | test output, video timestamp | Simultaneous actions and reload |
| PENDING | Replay/fork | Local patch time travel and persistent prefix fork work | E2E, parent/child URLs, hashes | test output | Inspect parent unchanged |
| PENDING | Custom geometry | Zone relations use vector kernel, not pixel hit testing | geometry source/tests/debug overlay | `src/geometry/**`, artifact | Code review and fixtures |
| PENDING | Static AI-generated art | Art was generated specifically for project and has fallback/provenance | asset manifest, prompt/model/date, fallback screenshot | manifest/files | Disable asset load and compare |
| PENDING | Secret safety | No OpenAI/Cloudflare/capability secret in tracked files or bundle | secret scan output and manual bundle search | CI artifact | Run scan on tagged commit |
| PENDING | Cost control | Per-room/global budgets and kill switch work | Worker tests and forced-limit screenshot | test output | Trigger limits in test env |
| PENDING | Cloudflare deployment | Worker, static assets, SQLite DO, and WebSockets are deployed | Wrangler config, deploy run, health, room test | files/Actions URL | Production smoke |
| PENDING | Test reproducibility | Clean clone passes documented validation | clean-clone log/CI | Actions run URL | New checkout with frozen lockfile |
| PENDING | Potential impact | Demo credibly shortens idea-to-playtest loop for target user | user narrative tied to working sequence | Devpost story + demo | Reviewer evaluates demonstrated path |
| PENDING | Quality/novelty | One language unifies creation, play, AI actions, reversibility, and sharing | architecture plus visible demo | tech design, video | Rubric grader evidence review |
| PENDING | Submission freeze | Production and materials correspond to tagged commit | version endpoint, tag, deploy metadata | `<prod>/api/version`, Git tag | Compare SHA everywhere |

## Screenshot targets

Capture at minimum:

1. first loaded table with Script and Replay visible;
2. replay cell + matching trace/table highlight;
3. direct legal-action targets;
4. AI-player action and reason;
5. committed blue-gate Scenario source;
6. connected room rotating with trigger trace;
7. game victory or collapse;
8. mobile judge layout;
9. two-client shared room if M7 ships;
10. labelled fallback;
11. reset/fresh copy;
12. test/CI/deploy success.

## Video evidence targets

Fill after edit:

| Segment | Target timestamp | Final timestamp | Verified |
|---|---:|---:|---|
| Immediate working table | 00:00–00:10 | PENDING | [ ] |
| Replay causality | 00:10–00:28 | PENDING | [ ] |
| Human and AI turns | 00:28–00:45 | PENDING | [ ] |
| GPT-5.6 live rule authoring | 00:45–01:12 | PENDING | [ ] |
| Triggered blue-gate effect | 01:12–01:25 | PENDING | [ ] |
| Interpreter/rebase architecture | 01:25–01:48 | PENDING | [ ] |
| Codex collaboration | 01:48–02:05 | PENDING | [ ] |
| Impact, complete game, close | 02:05–02:20 | PENDING | [ ] |

## Final evidence rule

If a feature was cut or is unreliable:

- remove the claim from README/copy/video;
- mark the row `CUT` with the exact decision/commit;
- do not use future-tense language to imply it works now.
