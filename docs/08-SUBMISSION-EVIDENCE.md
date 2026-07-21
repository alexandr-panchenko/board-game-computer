# Submission evidence matrix

Do not replace `PENDING` with `VERIFIED` until the exact artifact exists and has
been personally checked against the tagged production build. General claims are
not evidence.

## Release identifiers

- Production URL: `https://boardgamecomputer.com/` — candidate verified;
  tagged-commit comparison pending
- Judge URL: `https://boardgamecomputer.com/judge` — candidate verified;
  tagged-commit comparison pending
- Repository URL:
  `https://github.com/alexandr-panchenko/board-game-computer` — public clone
  verified; release tag pending
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

## M9 release-candidate evidence

- M8 closure/M9 start commit `a2cbde501931373017a8213373aa3a2d52a39501`
  passed both GitHub Actions jobs in run
  `https://github.com/alexandr-panchenko/board-game-computer/actions/runs/29815090407`;
  a separate exact-commit apex smoke passed.
- A first fresh public clone exposed a Bun 1.2.5 lifecycle race: transitive
  `sharp` tried an unnecessary source build before its installed optional
  prebuilt package was usable. The failure was not hidden. `bunfig.toml` now
  disables dependency lifecycle scripts; all required native packages remain
  locked prebuilt artifacts.
- A second untouched public clone with that configuration installed 235
  packages successfully on its first `bun install --frozen-lockfile`, loaded
  `sharp` successfully, passed strict TypeScript, and passed all 14 Worker
  tests. A full committed clean-clone repeat remains required before tagging.
- The working-tree M9 candidate passed frozen install, 50 unit tests, 14 Worker
  tests, 36 desktop/mobile E2E checks, two production builds, a
  111-file-plus-build secret scan, and 27 direct dependency licenses. The exact
  grep command reported only tracked documentation examples of the variable
  name/pattern, not assigned secret values.
- Conservative eligibility, rubric, first-impression, and browser-path
  self-audits are preserved in `docs/15-RELEASE-REVIEW.md`. They explicitly
  leave owner eligibility, public video, primary Session ID, author-voice copy,
  final tag, and submitted confirmation unproven.

## Requirements and judging evidence

| Status | Requirement / criterion | Claim to verify | Exact evidence required | URL/file/video timestamp | Verification method |
|---|---|---|---|---|---|
| CANDIDATE PASS — tag pending | Working project | Production app consistently loads and functions as described | 36/36 production E2E, smoke, screenshots | `https://boardgamecomputer.com/`; M8 evidence above | Repeat on tagged commit |
| PENDING — owner form | Apps for Your Life category | Product serves consumer creativity/playtesting | Product brief, first screen, selected-category screenshot | `docs/01-PRODUCT-BRIEF.md`; `evidence/local/m8-production-desktop.png` | Owner selects one category and records form |
| CANDIDATE PASS — attestation pending | New/meaningful Build Week work | New implementation and prior exploration are distinguished | Dated history and disclosure | `docs/11-PREEXISTING-WORK-DISCLOSURE.md`; commits `9e78db4..a2cbde5` | Owner completes disclosure attestation |
| PENDING — Session ID | Codex use | Primary session built core functionality | Commit history, README examples, `/feedback` ID | README Codex section; milestone commits; private ID missing | Owner obtains primary ID |
| CANDIDATE PASS — video pending | GPT-5.6 use | Designer authors validated source and AI selects legal option | Integration files and bounded live M5/M6 trace | `src/worker/ai/**`; M5/M6 evidence above | Repeat live on final candidate and add video timestamps |
| CANDIDATE PASS — tag pending | Free testing access | Judge can use app without payment | Clean production browser path | `https://boardgamecomputer.com/judge` | Recheck tagged commit incognito |
| CANDIDATE PASS — tag pending | No login / BYOK | Judge path needs no registration or user key | JUDGING guide and clean screenshots | `JUDGING.md`; M8 desktop/mobile screenshots | Recheck tagged commit incognito |
| PENDING | Public demo video | Video is public YouTube, under three minutes, with audio | YouTube page and duration | `<youtube-url>` | Incognito playback |
| PENDING | Video explains Codex and GPT-5.6 | Audio explicitly covers both | Transcript/timestamps | Video `mm:ss–mm:ss` | Listen and compare transcript |
| CANDIDATE PASS — tag pending | Repository access/license | Repository is publicly cloneable and MIT licensed | Public clone and license | `https://github.com/alexandr-panchenko/board-game-computer`; `LICENSE` | Clone tagged repository unauthenticated |
| CANDIDATE PASS — tag pending | README completeness | Setup, tests, sample, Codex, human decisions, GPT usage are concrete | Final README sections | `README.md` | Fresh-reader/tag audit |
| PENDING | `/feedback` Session ID | Correct primary project thread ID entered | Devpost form screenshot/private record | Devpost submission | Human verification |
| PENDING — video | English materials | UI/docs are English; video/transcript must be English | Source/screenshots pass; transcript absent | UI, README, JUDGING; public video pending | Review final audio/transcript |
| CANDIDATE PASS — video audit pending | Original/IP-safe assets | Original primitives/game; no external art/music; dependencies licensed | Notices and license scan | `THIRD_PARTY_NOTICES.md`; 27 direct licenses | Audit final video audio/thumbnail |
| CANDIDATE PASS — tag/video pending | Technological Implementation | Custom reversible interpreter is non-trivial | Runtime sources and 50 unit tests | `src/runtime/**`; `tests/unit/**`; M3 evidence | Show in video and rerun tag |
| CANDIDATE PASS — tag pending | Reversible cells | Successful cells record forward/inverse patches | Runtime/rollback tests and inspector | `tests/unit/rollback.test.ts`; runtime inspector E2E | Rerun tag |
| CANDIDATE PASS — tag pending | Atomic failure | Failed source preserves pre-cell hash | Runtime/framework invariant/fuel tests | `tests/unit/runtime/runtime.test.ts`; `tests/unit/framework/framework.test.ts` | Rerun tag |
| CANDIDATE PASS — video pending | No full-room replay in rebase | Ordinary rebase touches pending tail only | Instrumented rebase test and production two-client run | `tests/unit/runtime/rebase.test.ts`; M7/M8 evidence | Add brief video proof |
| CANDIDATE PASS — tag pending | Determinism | Independent runtimes/clients converge | Determinism and two-context tests | `tests/unit/determinism.test.ts`; production 36/36 | Rerun tag |
| CANDIDATE PASS — video pending | Complete game | Shifting Vaults reaches victory and collapse | Deterministic tests and desktop/mobile E2E | `tests/unit/sample/shifting-vaults.test.ts`; E2E real ending | Show continued playable state/video |
| PENDING | Design coherence | First screen, replay, takeover, agent change form one clear experience | 90-second recording and first-impression review | video `00:00–01:30` | External review prompt |
| CANDIDATE PASS — video pending | First-screen value | Table appears before any AI call | Zero-request E2E and screenshots | `tests/e2e/judge-shell.spec.ts`; M8 screenshots | Show at video 00:00 |
| CANDIDATE PASS — video pending | Guided causality | Source, trace, and table advance together | Hero E2E and M6 evidence | E2E judge-path test | Add video timestamp |
| CANDIDATE PASS — video pending | Human legal action | Registered Player action commits | Hero/drag E2E | E2E tests lines 162/267 | Add video timestamp |
| CANDIDATE PASS — video pending | AI legal action | Live/fallback selects materialized option | M5 live result and AI tests | `src/app/ai-client.ts`; M5 evidence | Add video timestamp |
| CANDIDATE PASS — exact live repeat pending | Live rule change | GPT-authored Scenario validates, commits, and fires | M5/M6 live trace and hero test | M6 9,764 ms trace | Repeat on final commit and video |
| CANDIDATE PASS — tag pending | Repair loop | Invalid candidates repair without log pollution | Mock repair tests | `tests/unit/ai/ai.test.ts`; mocked AI E2E | Rerun tag |
| CANDIDATE PASS — tag pending | AI fallback | AI-disabled path remains playable | 36/36 AI-disabled and budget screenshot | M8 evidence and `m8-production-budget-fallback.png` | Rerun tag |
| CANDIDATE PASS — tag pending | Reset/fresh copy | Judge path is reproducible | Reset/replay/fresh E2E | `JUDGING.md`; E2E reset test | Rerun tag |
| CANDIDATE PASS — real-device pending | Mobile support | Pixel 7 viewport completes full path | 18/18 mobile and production screenshot | `m8-production-mobile.png` | Owner checks physical device |
| CANDIDATE PASS — keyboard audit pending | Semantic controls | Status/actions exist outside canvas and are touch sized | DOM role/size tests | E2E semantic/mobile tests | Owner keyboard pass |
| CANDIDATE PASS — video pending | Shared room | Two clients order, rebase, reconnect, converge | Production E2E and M7 hashes | M7/M8 evidence | Optional video proof |
| CANDIDATE PASS — tag pending | Replay/fork | Patch timeline and persistent prefix fork work | Production E2E and parent/child evidence | M7 evidence | Rerun tag |
| CANDIDATE PASS — tag pending | Custom geometry | Geometry is renderer-independent | Geometry sources/tests | `src/geometry/**`; geometry unit tests | Rerun tag |
| CUT — no claim | Static AI-generated art | Optional art was not shipped | M8 cut record; original primitives remain | M8 evidence; `THIRD_PARTY_NOTICES.md` | Remove art checkbox/claim from copy |
| CANDIDATE PASS — tag pending | Secret safety | No key/capability in tracked files or bundle | 109-file-plus-build secret scan | CI run `29814603946`; `scripts/check-secrets.ts` | Run exact grep/scan on tag |
| CANDIDATE PASS — tag pending | Cost control | Per-room/global budgets and kill switch cap use | Worker tests and simulated budget screenshot | `tests/workers/ai.test.ts`; M8 budget artifact | Rerun tag |
| CANDIDATE PASS — tag pending | Cloudflare deployment | Assets, SQLite DO, WebSockets deployed | Wrangler config, version, smoke, production rooms | M8 versions and run `29814603946` | Compare tag/version |
| FIX IN VALIDATION | Test reproducibility | First clean install raced sharp lifecycle check; ignore-scripts fix passes untouched clone | Second fresh clone: 235 packages, sharp load, typecheck, 14 Worker tests | `bunfig.toml`; M9 log | Commit fix and rerun full clean checkout |
| PENDING | Potential impact | Demo credibly shortens idea-to-playtest loop for target user | user narrative tied to working sequence | Devpost story + demo | Reviewer evaluates demonstrated path |
| CANDIDATE PASS — video pending | Quality/novelty | One language unifies creation, play, AI actions, reversibility, and sharing | Architecture, product, review score | `docs/04-TECHNICAL-DESIGN.md`; `docs/15-RELEASE-REVIEW.md` | Add visible video evidence |
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
