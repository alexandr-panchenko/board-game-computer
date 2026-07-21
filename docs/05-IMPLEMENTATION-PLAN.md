# Implementation plan

This is the execution runbook for the primary Codex build session. Milestones
must be completed in order. A failed required validation blocks progression.

## Global rules

- Keep `main` deployable after M2.
- Update `STATUS.md` at milestone start and completion.
- Add exact evidence to `docs/08-SUBMISSION-EVIDENCE.md` as work occurs.
- Use the specified commit message unless the actual scope requires a clearer
  equivalent.
- Do not begin a kill-list feature.
- Do not hide failed checks or replace live behavior with unlabeled mocks.
- The complete single-room judge path at M6 is the hard cut line. If necessary,
  cut M7 collaboration polish before weakening M3–M6.

---

# M1 — Repository and reproducible environment

## Objective

Create a clean Bun/React/TypeScript/Cloudflare project that a fresh clone can
install, validate, test, build, and run with documented commands.

## Files/components affected

- `package.json`, `bun.lock`;
- Vite/Cloudflare/TypeScript configuration;
- `src/app`, `src/worker`, `src/shared` skeletons;
- test configuration and example tests;
- GitHub Actions validation workflow;
- `scripts/` validation helpers;
- `.dev.vars.example` if useful, while keeping `.env.example` canonical;
- root documentation and `STATUS.md`.

## Implementation steps

1. Scaffold the current official Cloudflare React + Vite pattern without
   overwriting the design packet.
2. Configure Bun as package manager and commit the lockfile.
3. Enable strict TypeScript, including no implicit `any`, no unchecked indexed
   access where practical, and exact optional properties where compatible.
4. Add direct dependencies expected by the design:
   - React/React DOM;
   - Acorn/acorn-walk;
   - PixiJS;
   - OpenAI SDK;
   - Zod or an equivalent explicit schema boundary.
5. Add development tooling:
   - Vite and Cloudflare Vite plugin;
   - Wrangler;
   - Vitest and Workers pool;
   - Playwright;
   - ESLint and Prettier, or one documented equivalent that preserves the
     required command names.
6. Create required package scripts from `AGENTS.md`.
7. Add one browser-independent unit test, one Worker test, and a Playwright
   smoke test that opens `/judge` locally.
8. Implement `scripts/check-secrets.ts` and `scripts/check-licenses.ts` enough
   to fail on obvious tracked secrets and unapproved package licenses.
9. Add CI that runs non-live validation on pull requests and `main`.
10. Document exact clean-clone setup in README.

## Acceptance criteria

- `bun install` creates a committed lockfile.
- All required commands exist and do not depend on uncommitted local files.
- Unit, Workers, and E2E test harnesses each run at least one meaningful smoke
  test.
- OpenAI key is optional for deterministic tests.
- `.dev.vars`, `.env`, and credentials are ignored.
- CI contains no real credentials.
- README clean-clone instructions match reality.

## Commands to validate

```bash
bun install
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

## Expected UI/behavior

A minimal responsive app shell loads locally at `/` and `/judge`, clearly
labelled as an implementation shell rather than a finished demo.

## Failure handling

- If the latest Cloudflare scaffold conflicts with Bun, use Bun to invoke the
  same Vite/Wrangler commands rather than changing production runtime.
- If a dependency license is unclear, stop using it or document/verify it
  before continuing.
- Do not add OpenAI calls to make the smoke test pass.

## Dependencies

None beyond repository access and local tooling.

## Commit message

```text
chore: establish reproducible Board Game Computer repository
```

## Fallback/cut option

None. This milestone is mandatory.

## Evidence to record

- clean install command/output;
- CI workflow path;
- successful command summary;
- initial repository tree;
- commit SHA.

---

# M2 — Deployable vertical slice

## Objective

Deploy a working URL as early as possible. The slice proves Cloudflare static
assets, Worker API routing, Durable Object binding, CI deployment, and a
judge-friendly first route before core runtime work.

## Files/components affected

- `src/worker/index.ts`;
- initial `RoomObject` stub and Wrangler migrations;
- React route/app shell;
- `/judge`, `/api/health`, `/api/version`;
- GitHub Actions deploy workflow;
- Cloudflare configuration;
- README, JUDGING, STATUS, evidence.

## Implementation steps

1. Configure one Cloudflare Worker project serving the React build and Worker
   routes.
2. Add a SQLite-backed Durable Object namespace and minimal room health method.
3. Implement `/api/health` returning build/version status with no secrets.
4. Implement `/api/version` with commit SHA/build timestamp when available.
5. Make `/` and `/judge` render a responsive tabletop shell with:
   - table region;
   - Script, Chat, Replay placeholders;
   - no login/BYOK;
   - visible Reset/Fresh copy placeholder;
   - semantic controls.
6. Add a primitive deterministic local scene so the first screen is not blank.
7. Configure GitHub Actions:
   - validation job;
   - build;
   - deploy on `main` using Cloudflare secrets;
   - optional preview/version upload before production promotion.
8. Deploy and test in a clean browser.
9. Record the real URL only after verification.

## Acceptance criteria

- Production URL and `/judge` return 200.
- Page loads without login, API key, CAPTCHA, or WAF challenge.
- Health endpoint works.
- Durable Object binding can be reached by a Worker integration test.
- GitHub Actions deploy succeeds from repository state.
- Desktop and mobile shell do not overflow or hide primary controls.
- No OpenAI secret is in the browser bundle.

## Commands to validate

```bash
bun run validate
bun run build
bun run deploy
curl -fsS https://<production-host>/api/health
curl -I https://<production-host>/judge
bun run test:e2e -- --grep "production shell"
```

## Expected UI/behavior

A polished-enough shell with an obvious tabletop and textual status opens
instantly. It may still use a static primitive scene, but it must never present
placeholder behavior as the final AI/game implementation.

## Failure handling

Missing Cloudflare credentials are a true blocker for the actual deploy. Codex
must still finish configuration and local checks, then ask only for the needed
secret/action.

## Dependencies

M1; Cloudflare account/project; GitHub repository secrets.

## Commit message

```text
feat: deploy the initial Board Game Computer vertical slice
```

## Fallback/cut option

Use a direct `workers.dev` URL; custom domain is not required.

## Evidence to record

- production URL;
- successful deploy run;
- health output;
- desktop/mobile screenshots;
- no-login clean-browser check;
- commit SHA.

---

# M3 — Reversible interpreter core

## Objective

Implement and prove the central technical innovation: a deterministic Acorn AST
interpreter with persistent scopes/closures, atomic transactions, forward and
inverse patches, fuel, state hashing, and pending-tail rebase.

## Files/components affected

- `src/runtime/parser`;
- `src/runtime/validator`;
- `src/runtime/interpreter`;
- `src/runtime/store`;
- `src/runtime/sync`;
- `src/shared` language/protocol versions;
- unit/property/differential tests;
- a small runtime inspector UI in `/judge` or a development route.

## Implementation steps

### Parser and diagnostics

1. Parse cells with Acorn and retain source spans.
2. Cache AST by source hash.
3. Implement the versioned AST allowlist and stable error codes.
4. Reject unsupported loops, async, imports, native access patterns, dangerous
   properties, and invalid Player action shapes.

### Store

5. Implement stable scope, slot, object, and function IDs.
6. Implement runtime values, plain records, arrays, functions, and closures.
7. Route every store change through a transaction mutation union.
8. Implement deterministic allocators and canonical serialization/hash.

### Interpreter

9. Implement required language nodes in the order listed in the language
   reference.
10. Implement completion records for return/break/continue/errors.
11. Implement fuel, call-depth, collection, heap, and source limits.
12. Add whitelisted pure native helpers only as tests require.

### Reversibility

13. Derive forward/inverse patches from transaction mutations.
14. Implement apply-forward/apply-inverse and exact hash assertions.
15. Ensure failed execution and failed invariant hooks restore pre-cell state.

### Pending-tail rebase

16. Implement a local confirmed runtime plus pending transaction stack.
17. Undo all pending in reverse, apply an authoritative test cell, and
   re-execute pending in order.
18. Surface conflicts without replaying committed history.

### Technical spike UI

19. Provide a developer-facing cell runner showing source, bindings, patch
   summary, trace, state hash, undo, and redo. It may be hidden from final
   judge UI but must support manual verification.

## Acceptance criteria

- `let`, `const`, block scopes, records, arrays, functions, arrows, closures,
  `if`, and finite `for...of` behave as documented.
- Unsupported syntax has exact diagnostics.
- Every successful cell has forward/inverse patches.
- `beforeHash === undo(after).hash` for all mutation families.
- `afterHash === redo(undo(after)).hash`.
- failed cell leaves exact hash and allocator/RNG placeholders unchanged.
- fuel/depth stop dynamic cycles without hanging the browser.
- two independent runtimes replay the same cells to the same hash.
- rebase test undoes only pending A, applies B, re-executes A, and converges.
- no `eval`, `Function`, DOM, network, Pixi, or host object enters interpreted
  execution.
- performance meets provisional budgets in the test plan.

## Commands to validate

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test -- runtime
bun run test -- rollback
bun run test -- rebase
bun run test -- determinism
bun run build
bun run validate
```

## Expected UI/behavior

A source cell can define values/functions, mutate runtime state, show patch
changes, undo instantly, and redo identically. A deliberately invalid or
fuel-exhausting cell produces a diagnostic and no state change.

## Failure handling

- Do not fall back to native `eval`.
- Reduce the supported syntax to the frozen minimum rather than weakening
  transactional guarantees.
- If a convenience array method is difficult, omit it and use `for...of` in
  sample source.

## Dependencies

M1. M2 should remain deployed independently.

## Commit message

```text
feat: implement the reversible Board Game Computer interpreter
```

## Fallback/cut option

Cut optional syntax (`switch`, spread, callback array methods, throw) before
cutting closures, patches, rollback, fuel, or state hashing.

## Evidence to record

- runtime architecture files;
- rollback/redo/rebase test names and output;
- performance benchmark output;
- development inspector screenshot/video;
- commit SHA.

---

# M4 — Table framework, geometry, renderer, and complete deterministic sample

## Objective

Build the tabletop framework and a complete deterministic `Shifting Vaults`
game playable without OpenAI.

## Files/components affected

- `src/runtime/framework`;
- `src/geometry`;
- `src/render`;
- `src/sample/shifting-vaults`;
- React table/action/trace UI;
- runtime and E2E tests;
- primitive assets.

## Implementation steps

### Framework primitives

1. Implement stable entities, zones, players, cards, decks, counters, tags,
   ownership, containers, positions, and rotations on the transactional store.
2. Implement deterministic PRNG, shuffle, draw, choice, and roll.
3. Implement event queue, stable trigger ordering, Scenarios, Given/When/Then,
   Invariants, and trace.
4. Implement registered Actions with finite choice materialization,
   availability, execution, UI metadata, and Player action source.
5. Implement turn/phase helpers and game result state.

### Geometry

6. Implement lines, cubic Bézier, arcs, paths, transforms, AABB, containment,
   intersection, overlap, z-hit selection, and debug overlay.
7. Implement room edge/door topology and rotation-aware connections.
8. Cover geometry with deterministic fixtures including tolerances.

### Renderer

9. Implement `TableRenderer` and Pixi adapter.
10. Project stable runtime IDs to Pixi nodes; keep runtime canonical.
11. Implement top-down rooms, explorer tokens, relic/hazard/tactic components,
    threat/turn indicators, short move/rotate/flip animations, and drag preview.
12. Add semantic HTML status/action list around the canvas.

### Complete sample

13. Encode `shifting-vaults-v1` setup, rules, actions, scenarios, invariants,
    seeded content, and ending exactly from the sample spec.
14. Implement deterministic fallback AI policy locally, even before live model.
15. Create tests that play to explorer victory and vault collapse.
16. Create the curated judge checkpoint and guided historical cells.
17. Add Reset/Fresh game using immutable bundled template data.

## Acceptance criteria

- Fresh game setup is deterministic from seed.
- All required components render and are selectable on desktop/mobile.
- Drag/drop produces one legal action cell on release.
- Geometry, not pixel hit testing, determines zone relations.
- Legal actions are finite, correct, and shared by HTML and renderer.
- Cards draw/discard/reshuffle correctly.
- Both win and loss endings are reachable.
- Fallback AI completes legal turns.
- The full 10–15 minute game can be finished without manual repair.
- Undo/redo of game actions restores exact hashes and visuals.
- Curated checkpoint is deterministic and suitable for the hero path.

## Commands to validate

```bash
bun run test -- framework
bun run test -- geometry
bun run test -- shifting-vaults
bun run test:e2e -- --grep "complete deterministic game"
bun run test:e2e -- --grep "mobile game controls"
bun run build
bun run validate
```

## Expected UI/behavior

A judge can open the sample, play an entire game against deterministic fallback
AI, see legal targets, cards, threat, objectives, trace, and a clear winner or
collapse state without any OpenAI request.

## Failure handling

- Keep primitive art if generated art is not ready.
- Reduce visual flourish before reducing complete-game rules.
- If curves are risky, retain segment types but use tested adaptive subdivision
  with documented tolerance.
- Do not replace direct manipulation with arbitrary state editing.

## Dependencies

M3; M2 production shell.

## Commit message

```text
feat: ship the deterministic Shifting Vaults tabletop
```

## Fallback/cut option

Cut nonessential card animation and optional geometry helpers. Keep seven
rooms, connections/rotation, relic/hazard search, tactic deck, threat, two
seats, legal actions, and real endings.

## Evidence to record

- fresh-game and ending test output;
- geometry test output/debug screenshot;
- desktop/mobile gameplay screenshots;
- deterministic seed/hash;
- complete game recording or test trace;
- commit SHA.

---

# M5 — GPT-5.6 Designer and AI-player integration

## Objective

Add visible, honest, validated GPT-5.6 use without making the deterministic
product dependent on a successful model call.

## Files/components affected

- `src/worker/ai`;
- server routes/SSE;
- OpenAI strict tool schemas;
- prompt/context builders;
- global Budget Durable Object;
- client Chat/job state;
- candidate validation/repair protocol;
- AI-player legal-action endpoint;
- mocked and optional live tests.

## Implementation steps

### Server boundary

1. Add OpenAI SDK only to Worker code paths.
2. Implement `BudgetObject` and per-room/global request checks.
3. Implement Designer endpoint with `gpt-5.6`, Responses API, strict forced
   `propose_room_cell` tool, `parallel_tool_calls: false`, timeout,
   cancellation, and streamed progress.
4. Implement context builder using full small-room source plus runtime
   inspection, language contract, and hard character limit.
5. Never include room capability secrets or OpenAI key in prompts/logs.

### Client validation and repair

6. Receive candidate source and summary.
7. Parse, validate, and execute candidate as a speculative transaction against
   current runtime.
8. On failure, post structured diagnostics for the next repair attempt.
9. Permit no more than three total attempts.
10. Revalidate if room sequence changed before commit.
11. Commit only successful source and show it as a normal cell.
12. Keep failed candidates out of committed timeline.

### AI player

13. Materialize legal action options and concise state inspection. Each option
    receives a stable opaque `optionId`; literal action arguments stay local.
14. Call `gpt-5.6-luna` with a strict forced choose-action tool,
    `parallel_tool_calls: false`, returning only `option_id` and a short reason.
15. Map the selected option locally, then revalidate it immediately before
    execution.
16. Execute through the same `performAction` path as a human.
17. On failure/timeout, use the deterministic policy and label the move.

### Tests

18. Add mocked fixtures for valid first attempt, syntax repair, runtime repair,
    all-attempt failure, timeout, rate limit, stale base, invalid chosen action,
    and fallback.
19. Add one opt-in live smoke test guarded by environment and never required by
    ordinary CI.

## Acceptance criteria

- OpenAI key is absent from client output.
- Designer request streams visible progress and returns strict source envelope.
- Invalid source is repaired or fails without room mutation.
- Hero rule can be generated, validated, committed, and triggered.
- AI player selects only a listed legal action.
- Fallback AI and example-rule flow work with `AI_ENABLED=false`.
- Request timeout, cancellation, per-room limit, and global daily guard work.
- Logs include latency/outcome but no secrets or hidden reasoning.

## Commands to validate

```bash
AI_ENABLED=false bun run test -- ai
AI_ENABLED=false bun run test:workers -- ai
AI_ENABLED=false bun run test:e2e -- --grep "AI fallback"
bun run secrets:check
bun run build
bun run validate
# Optional with explicit secret and budget:
bun run test:ai:live
```

## Expected UI/behavior

Chat shows meaningful progress, then a committed highlighted source cell. The
prepared blue-gate request visibly changes later play. The AI seat performs a
legal move with a concise reason. Failure leaves the table playable.

## Failure handling

- If live API access is blocked, finish and demonstrate the labelled fallback,
  preserve exact integration code/tests, and treat missing credential/access as
  a true blocker for final live evidence.
- Do not loosen the language validator to accept model output.
- Prefer a clearer prompt and diagnostics over a larger supported language.

## Dependencies

M3 and M4; OpenAI API secret for live validation.

## Commit message

```text
feat: integrate validated GPT-5.6 game authoring and play
```

## Fallback/cut option

Keep one Designer flow and one AI-player call. Cut generalized conversation
memory, additional model routes, or rich chat features.

## Evidence to record

- exact integration files/tool schema;
- successful and repaired call traces without secrets;
- fallback test output;
- hero rule screenshot/video;
- model IDs/config;
- commit SHA.

---

# M6 — Complete hero and judge flow

## Objective

Turn the deterministic game and AI boundaries into one coherent, repeatable,
submission-ready 60–90 second product experience.

## Files/components affected

- guided replay controller;
- curated template and checkpoint;
- takeover/fresh-room flow;
- Chat/Script/Trace synchronization;
- judge route and coach marks;
- result/reset UI;
- responsive desktop/mobile layouts;
- JUDGING, README, E2E fixtures.

## Implementation steps

1. Bundle immutable judge template and exact guided checkpoint.
2. Implement replay steps with source, trace, focus, and tabletop animations.
3. Add inline coach marks and skip/takeover controls without a blocking modal.
4. On takeover, continue locally and create a persistent room on first saved
   action if room persistence is already present; otherwise use the local room
   abstraction ready for M7.
5. Highlight a legal human action and ensure it cannot dead-end.
6. Run the AI-player action.
7. Provide the prepared Designer prompt chip and free-form composer.
8. Commit and highlight the blue-gate Scenario.
9. Guide the user to a legal blue-gate move and show the room rotation trace.
10. Keep the full game playable to winner/collapse after the rule.
11. Implement **Return to demo checkpoint**, **Replay from start**, **Fresh
    copy**, and labelled example rule.
12. Make `/` and `/judge` equivalent reliable entry points.
13. Write exact E2E tests for the entire path using mocked AI and one production
    smoke path that can use live AI manually.
14. Update `JUDGING.md` to the literal production path.

## Acceptance criteria

- First useful visual state appears before an AI request.
- A first-time user can understand replay → takeover without explanation.
- Exact judge path completes in under 90 seconds excluding variable live model
  latency; progress prevents apparent freezing.
- Human action, AI action, generated rule, and triggered effect all use real
  runtime boundaries.
- Sample remains complete and can reach an ending.
- Fallback path completes without OpenAI.
- Reset/fresh copy reproduces the path.
- Desktop and minimum mobile E2E pass.
- No TODO, placeholder, or fake result is visible in the mandatory path.

## Commands to validate

```bash
AI_ENABLED=false bun run test:e2e -- --grep "judge path"
AI_ENABLED=false bun run test:e2e -- --grep "reset demo"
AI_ENABLED=false bun run test:e2e -- --project mobile
bun run build
bun run validate
bun run deploy
```

Then manually verify production with live AI and record the outcome.

## Expected UI/behavior

Exactly the path in `JUDGING.md`, with a polished table, clear causality,
non-blocking progress, and a real ending beyond the 90-second highlight.

## Failure handling

- If a live model response is unreliable, improve prompt/examples and keep
  labelled fallback; never hardcode and label it live.
- Cut nonessential panel animation or decorative art before changing the flow.
- If mobile layout is crowded, use bottom-sheet tabs rather than hiding
  controls.

## Dependencies

M4 and M5. M2 production deployment must remain active.

## Commit message

```text
feat: complete the Board Game Computer judge experience
```

## Fallback/cut option

This milestone is the hard cut line and cannot be cut. Finish it before M7.

## Evidence to record

- full desktop/mobile E2E traces;
- 90-second screen recording;
- live AI success and fallback recordings;
- production screenshots;
- reset verification;
- commit SHA.

---

# M7 — Persistent shared rooms, optimistic rebase, replay, and fork

## Objective

Complete the room model with Durable Object persistence, two connected clients,
reconnect, pending-tail rollback/reapply, local time travel, and persistent
forks.

## Files/components affected

- `RoomObject` SQLite schema and migrations;
- WebSocket hibernation protocol;
- capability URL generation/join;
- client confirmed/pending state machine;
- reconnect/tail retrieval;
- timeline patch storage;
- fork/export endpoints;
- two-context integration/E2E tests.

## Implementation steps

1. Implement room creation from immutable template with random room ID and
   Designer/Player capability secrets; store only hashes.
2. Persist ordered cells, metadata, head sequence/hash, and idempotency keys.
3. Assign monotonic sequence numbers and accept executable cells only when
   `baseSeq === headSeq` and the base-hash attestation matches; reject stale
   bases with `rebase_required` plus missing cells.
4. Implement Hibernatable WebSocket join, attachments, broadcast, and reconnect.
5. Implement a client pending stack with at most one canonical proposal in
   flight per client/room:
   - speculative execute;
   - queue later local transactions without sending them yet;
   - inverse rollback;
   - authoritative apply;
   - pending re-execute;
   - resubmit the oldest valid pending cell against the new head;
   - conflict handling.
6. Verify no committed-history replay occurs during ordinary rebase.
7. Implement state-hash reporting and divergence recovery.
8. Implement local previous/next/return-live using patches.
9. Implement `Fork from here`, copying the selected source prefix into a child
   room with new capabilities.
10. Implement Player link and seat assignment for a second browser.
11. Add two-browser tests for ordering, idempotency, concurrent different/same
    entity actions, reconnect, hibernation/eviction, fork, and conflicts.

## Acceptance criteria

- Room survives reload.
- Two browser contexts receive one global order and converge to same hash.
- Concurrent local moves rollback only pending patches and do not recreate the
  whole runtime.
- Duplicate command ID commits once.
- No executable cell with a stale base enters the canonical log.
- Only one proposal per client/room is in flight; queued pending cells remain
  optimistic locally and are sent in order after commit/rebase.
- A stale command re-executes or reports a clear conflict.
- Hibernation/eviction does not lose WebSocket metadata or cells.
- Player link cannot submit a general Designer code cell through normal server
  validation.
- Timeline previous/next is instant for loaded history.
- Fork creates a separate persistent room and leaves parent unchanged.

## Commands to validate

```bash
bun run test:workers -- room
bun run test -- rebase
bun run test:e2e -- --grep "two-client room"
bun run test:e2e -- --grep "reconnect"
bun run test:e2e -- --grep "fork from here"
bun run build
bun run validate
```

## Expected UI/behavior

A user shares a Player link, both browsers play in the same room, actions order
correctly, reconnect works, and timeline/fork controls remain understandable.

## Failure handling

- Do not add locking.
- Do not implement general OT/CRDT.
- Reject irreconcilable semantic conflicts.
- If M7 threatens submission, activate the cut line: preserve persistent
  single-client room and judge flow; document multiplayer as incomplete rather
  than shipping a broken shared room.

## Dependencies

M3, M4, M6; Durable Object credentials/deployment.

## Commit message

```text
feat: add persistent shared rooms and reversible rebase
```

## Fallback/cut option

Cut remote drag previews and custom action transforms first. If necessary cut
live two-human sharing while retaining room persistence and local replay/fork.
Document the cut honestly.

## Evidence to record

- two-browser video;
- ordering/rebase test output;
- DO eviction test output;
- parent/fork URLs;
- state hash convergence;
- commit SHA.

---

# M8 — Reliability, mobile polish, security, cost, and production verification

## Objective

Harden the frozen product, complete mobile and semantic-control polish, verify
security/cost boundaries, and prove production reliability.

## Files/components affected

- error/recovery UI;
- responsive layout and touch interactions;
- rate/budget configuration;
- observability/redaction;
- secret/license scripts;
- production E2E/smoke tooling;
- static generated art and provenance if time;
- docs and evidence.

## Implementation steps

1. Test and polish every failure state in UX design.
2. Add cancellation and retry controls for AI jobs.
3. Verify global/per-room budget limits and kill switch.
4. Redact capability/API data from logs and errors.
5. Verify static AST/cell size limits and protocol validation.
6. Exercise divergence recovery and corrupt/local-cache recovery.
7. Complete mobile Playwright and real-device/manual touch checks.
8. Complete semantic action list, focus states, labels, and textual state.
9. Verify no console-breaking errors or unhandled promise rejections.
10. Run bundle/source-map secret scans.
11. Complete dependency license and asset provenance review.
12. If core validations are already green, replace primitive visuals with a
    coherent static AI-generated asset set and keep primitive fallback.
13. Use preview/version deployment before final production promotion and verify
    rollback to last good version.
14. Test the production URL in clean/incognito states.

## Acceptance criteria

- All error paths leave a usable product.
- Mobile can complete JUDGING path.
- API failure, timeout, repair exhaustion, and kill switch work.
- No secret appears in tracked files, bundle, source maps, logs, or screenshots.
- Budget limits permit judge path but cap abuse.
- Production deployment/rollback procedure is documented and tested.
- License/provenance checks pass.
- Static generated art, if added, does not affect deterministic geometry or
  fallback.
- Full validation suite is green.

## Commands to validate

```bash
bun run validate
AI_ENABLED=false bun run test:e2e
bun run test:e2e -- --project mobile
bun run secrets:check
bun run licenses:check
bun run build
bun run deploy
```

Run production smoke checks and manual clean-browser QA.

## Expected UI/behavior

A responsive, visually coherent product with graceful recovery, transparent
fallbacks, and no judging friction.

## Failure handling

- Cut generated art before reliability.
- Keep primitive assets if provenance or loading is uncertain.
- Do not deploy a risky change over the last verified production version.

## Dependencies

M6; M7 if retained.

## Commit message

```text
fix: harden the Board Game Computer production experience
```

## Fallback/cut option

Static generated art is fully cuttable. Mobile judge usability, failure
handling, budgets, and secret safety are not.

## Evidence to record

- mobile screenshots/video;
- API failure and budget screenshots;
- secret/license output;
- production version/rollback evidence;
- generated asset manifest if used;
- commit SHA.

---

# M9 — Submission evidence and release freeze

## Objective

Freeze a truthful release, collect exact evidence, finish English submission
materials in the author's voice, record the demo, and tag the submission.

## Files/components affected

- README, JUDGING, STATUS;
- `docs/08-SUBMISSION-EVIDENCE.md`;
- `docs/09-SUBMISSION-COPY-DRAFT.md` rewritten by the human;
- prior-work and third-party notices;
- release/tag metadata;
- screenshots and video references.

## Implementation steps

1. Run the complete validation suite from a clean checkout.
2. Build and deploy the exact candidate commit.
3. Verify production in clean desktop/mobile browser profiles.
4. Follow `JUDGING.md` literally with live GPT-5.6.
5. Follow fallback path with AI disabled/forced failure.
6. Run eligibility auditor, rubric grader, and first-impression prompts from
   `docs/10-REVIEW-PROMPTS.md`.
7. Fix evidence gaps/friction only; do not add new features.
8. Fill every evidence row with exact files, URLs, screenshot paths, test
   output, commit SHA, and video timestamps.
9. Update README with concrete Codex collaboration examples and human decisions.
10. Confirm prior-work disclosure and asset/dependency provenance.
11. Human rewrites Devpost copy in their own voice and removes unverified
    claims/placeholders.
12. Record and publish a public YouTube video under three minutes with audio.
13. Obtain and save the primary Codex `/feedback` Session ID for the form.
14. Commit release state.
15. Create and push `build-week-submission` tag.
16. Complete Devpost form and verify **Submitted** status before deadline.

## Acceptance criteria

- Every required check passes against the tagged commit.
- Production URL matches video and copy.
- JUDGING path works live and with fallback.
- Evidence matrix contains no vague or false claim.
- README identifies Codex/GPT-5.6 files and concrete human decisions.
- Video is public, processed, under three minutes, and has audio.
- Repository access/license is correct.
- Session ID is available for form.
- Devpost status is Submitted.

## Commands to validate

```bash
bun install --frozen-lockfile
bun run validate
bun run build
git status --short
git grep -nE '(sk-[A-Za-z0-9_-]+|CLOUDFLARE_API_TOKEN=.+|OPENAI_API_KEY=.+)' -- . ':!*.example'
git tag --list build-week-submission
```

Plus production/browser checks from JUDGING and human checklists.

## Expected UI/behavior

The exact tagged production build performs the recorded judge flow without
special knowledge or credentials.

## Failure handling

- Fix the failing evidence/reliability issue; do not add features.
- If a supporting feature is incomplete, remove its claim and UI entry rather
  than implying it works.
- Do not move the tag until the replacement release is fully re-verified.

## Dependencies

All retained milestones; Devpost, YouTube, Codex Session ID, production access.

## Commit message

```text
chore: freeze the OpenAI Build Week submission
```

## Fallback/cut option

None for mandatory submission artifacts. Optional supporting-feature claims may
be removed.

## Evidence to record

Everything in `docs/08-SUBMISSION-EVIDENCE.md`, final commit, tag, production
URL, public video URL, and Devpost submitted confirmation.

---

# Final autonomous completion report

The implementation agent's final report must contain:

- implemented milestones and any activated cuts;
- validation command results;
- production URL and judge route;
- live GPT-5.6 and fallback status;
- complete-game status;
- multiplayer/rebase status;
- release commit and tag;
- known risks;
- exact remaining human submission actions;
- readiness for video and Devpost.
