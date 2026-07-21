# Test plan

## 1. Purpose

Testing must prove the project's central claims, not only component coverage:

- source cells deterministically produce game state;
- every mutation is reversible;
- failed cells are atomic;
- optimistic rebase touches only pending operations;
- two clients converge;
- GPT-5.6 output cannot bypass validation;
- `Shifting Vaults` is a complete playable game;
- the production judge path works on desktop and mobile;
- fallback paths remain honest and usable.

## 2. Required commands

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

`bun run validate` aggregates all non-live checks required before a milestone
commit. Live OpenAI tests are opt-in and budget-gated.

## 3. Test layers

| Layer | Tool | Primary responsibility |
|---|---|---|
| Pure unit | Vitest | parser, validator, interpreter, patches, geometry, framework |
| Differential | Vitest + native JS test harness | supported expression semantics where safe/comparable |
| Runtime integration | Vitest | complete cells, triggers, invariants, sample turns |
| Worker/DO integration | Cloudflare Vitest pool | ordering, storage, WebSockets, hibernation, budgets, AI routes |
| Browser component | Vitest/DOM as needed | React panel/action behavior |
| E2E | Playwright | judge path, mobile, two-client convergence, failure paths |
| Production smoke | Playwright/manual/curl | real deployment and clean-browser behavior |
| Live AI smoke | opt-in | real GPT-5.6 strict tool and repair behavior |

## 4. Fixtures and determinism

Required fixtures:

- minimal language cells for each AST node;
- mutation fixture per mutation union member;
- closure/scope fixture;
- 500-cell synthetic room;
- rebase fixture with one, three, and conflicting pending cells;
- geometry corpus for line/Bézier/arc intersections;
- fresh `Shifting Vaults` seed;
- curated judge checkpoint;
- scripted explorer victory;
- scripted vault collapse;
- mocked AI response fixtures;
- stale-base and hash-mismatch room fixtures.

Every deterministic fixture pins:

- language version;
- framework version;
- source cell list;
- PRNG seed;
- expected final canonical hash.

## 5. Parser and validator tests

### Positive

- every supported statement/expression parses and validates;
- source ranges map to exact lines/columns;
- nested scopes and allowed property names pass;
- canonical Player action cell shape passes for Player capability;
- the same pure validator produces identical results in browser and Worker
  builds.

### Negative

Reject with stable diagnostic codes:

- syntax errors;
- `while`, classic `for`, `do...while`, `for...in`;
- imports/exports, async, generators, classes, `new`, `this`;
- `eval`, `Function`, forbidden globals, dangerous property names;
- unsupported AST nodes;
- direct and visible mutual recursion;
- oversized source and literals;
- Designer source submitted with Player capability;
- malformed action invocation;
- duplicate IDs or invalid static action arguments when detectable.

## 6. Interpreter semantic tests

Cover at minimum:

- primitive values and truthiness;
- arithmetic, string concatenation, comparisons, short-circuit logic;
- let/const initialization and assignment;
- block scope and shadowing;
- records, arrays, indexes, length, property create/update/delete;
- array mutation methods and callbacks retained in the final subset;
- function declarations, expressions, arrows, parameters, returns;
- closures reading and mutating captured slots;
- `if`, conditional, finite `for...of`, break, continue;
- native helper calls and runtime-value conversion;
- unknown identifiers and invalid references;
- fuel, call-depth, collection, heap, and trigger limits;
- deterministic errors and trace locations.

## 7. Differential tests

For programs using only supported pure semantics and no framework state:

1. execute in the custom interpreter;
2. execute an equivalent trusted native JavaScript snippet in the test process;
3. compare normalized outputs and thrown-error categories.

Use differential tests for arithmetic, booleans, arrays, records, functions,
closures, and loops. Do not use native execution as production implementation.

## 8. Transaction and patch invariants

For every mutation family:

### Atomic failure

```text
hash(before) == hash(after failed cell)
```

Also compare:

- scopes;
- slots;
- heap;
- functions/closures;
- registries;
- RNG;
- allocation counters;
- event queue.

### Undo

```text
execute(before, cell) -> after + inverse
applyInverse(after, inverse) -> exact before
```

### Redo

```text
applyForward(before, forward) -> exact after
```

### Patch composition

For cells A then B:

```text
undo(B); undo(A) == original
redo(A); redo(B) == final
```

### Nested transaction/example

An isolated Example/Test must leave the live hash unchanged whether it passes
or fails.

## 9. Rebase tests

### Independent operations

```text
confirmed S
apply pending A
receive authoritative B
undo A
apply B
re-execute A
```

Compare with fresh execution `S → B → A`.

### Multiple pending

Undo pending in reverse; authoritative apply; re-execute in original order.
Verify pending IDs and patches are replaced, not duplicated.

### Conflict

Examples:

- A moves an entity that B deletes;
- A spends a card that B spends first;
- A edits a rule binding that B replaces.

Expected: deterministic conflict diagnostic, no partial pending mutation, UI
can request a new action/repair.

### Performance assertion

Instrumentation must prove ordinary rebase does not execute any committed cell
before the confirmed head. A counter or spy should fail if full replay occurs.

## 10. Framework tests

- stable entity/zone/player/card/deck/counter creation;
- container/ownership conservation;
- finite legal-action materialization;
- availability changes after mutations;
- action effects share human/AI path;
- event FIFO and stable Scenario order;
- trigger cascade cap;
- invariant rollback;
- turn switching and action-point rules;
- deterministic PRNG, shuffle, draw, bag, and rollback;
- state hash excludes renderer/ephemeral UI.

## 11. Geometry tests

Use exact and tolerance fixtures for:

- line-line, line-Bézier, Bézier-Bézier;
- line-arc, arc-arc, Bézier-arc;
- tangency, shared endpoints, collinear overlap;
- transforms and rotations;
- point-on-edge and point-in-closed-path;
- containment vs intersection;
- overlap ratio;
- z-ordered hit selection;
- broad-phase AABB false positives followed by correct narrow phase;
- room door connections after 0/90/180/270 rotations;
- mobile-scale coordinates and high-DPI rendering independence.

Geometry test truth must not depend on canvas pixel reads.

## 12. Shifting Vaults tests

### Setup

- exact room/component counts;
- deterministic initial rotations, token assignment, and deck order;
- two cards then turn refill;
- correct active seat, AP, round, and Threat;
- all invariants pass.

### Actions

- move only through matching doors;
- rotate only adjacent, non-Gatehouse, unoccupied room;
- search once per room;
- relic/hazard resolution;
- each tactic card and once-per-turn rule;
- end-turn and round pressure;
- deck reshuffle.

### Endings

- collect two relics and return for player victory;
- Threat 10 for collapse;
- first committed ending is immutable;
- no ordinary action remains after end.

### Hero rule

- base game contains no blue-gate rotation Scenario;
- generated/example cell registers it;
- explorer entry rotates linked unoccupied room;
- occupied linked room produces traceable skip;
- undo removes the Scenario and restores later effects;
- game remains finishable after the rule.

### Full play

At least one deterministic scripted path and fallback-AI path complete a game
from fresh setup without direct store mutation.

## 13. Renderer and UI tests

- runtime change set creates/updates/removes correct Pixi nodes;
- inverse change set restores position/rotation/card state;
- drag preview is ephemeral;
- drop creates one action proposal;
- invalid drop returns visual state;
- Script/Trace highlight matches cell ID;
- HTML legal action list matches canvas highlights;
- winner/collapse state is visible in HTML;
- Reset/Fresh copy works repeatedly;
- no required path relies on hover only.

## 14. Durable Object tests

Use `@cloudflare/vitest-pool-workers`:

- room creation and capability hashing;
- monotonic sequence assignment;
- duplicate `commandId` idempotency;
- stale `baseSeq` returns missing tail/rebase response and appends no cell;
- mismatched base-hash attestation is rejected without advancing `head_seq`;
- per-client queue sends at most one canonical proposal at a time;
- a second optimistic local action remains queued, rebases, and is then sent
  against the new head;
- SQLite persistence across object eviction;
- WebSocket Hibernation attachment recovery;
- reconnect from last confirmed sequence;
- broadcast to multiple clients;
- source/cell size limits;
- role/cell-kind enforcement;
- fork prefix copy and parent immutability;
- head state-hash metadata;
- budget guard daily/per-room counters.

## 15. AI boundary tests

Mock the OpenAI SDK at the Worker boundary.

Required Designer fixtures:

1. valid first candidate;
2. parser failure then valid repair;
3. unsupported node then valid repair;
4. runtime/invariant failure then valid repair;
5. stale base requiring revalidation;
6. three failures and visible graceful stop;
7. timeout/cancel;
8. rate limit/global kill switch;
9. malformed strict tool output;
10. source exceeding limits.

Required AI-player fixtures:

- chooses a legal `option_id` and maps to the expected literal action;
- returns an unknown option ID;
- selected option becomes unavailable before execute;
- timeout falls back;
- fallback policy always returns legal action or End turn.

Assert that failed candidates do not appear in committed room cells.

## 16. End-to-end paths

### Mandatory mocked-AI judge path

- `/judge` first screen;
- three guided replay steps;
- takeover;
- human legal action;
- AI legal action;
- Designer prompt;
- repaired/valid source cell;
- blue-gate trigger;
- Reset/Fresh copy.

### AI disabled

Same path using fallback AI and labelled example rule.

### Complete game

Start fresh and reach one player victory and one collapse fixture.

### Mobile

Run judge path at minimum target viewport, including touch/drag or accessible
action alternative, bottom sheets, prompt, and reset.

### Two-client room

- Designer and Player contexts;
- simultaneous proposals;
- pending rollback/reapply;
- convergence hash;
- reconnect;
- fork.

### Production smoke

Run a small safe subset against the deployed URL without consuming excessive
AI budget. Live AI verification may remain manual if automated calls are risky.

## 17. Browser matrix

Minimum automated:

- Chromium desktop;
- Chromium mobile viewport.

Manual before submission where available:

- Safari/WebKit desktop or iOS;
- Firefox desktop;
- one real touch device.

If a browser is unsupported, document it before submission; do not claim broad
support without testing.

## 18. Performance budgets

Measure after correctness. Initial targets:

| Operation | Desktop target | Mobile target |
|---|---:|---:|
| Common action cell, including triggers | p95 < 50 ms | p95 < 100 ms |
| Apply one inverse/forward patch | p95 < 10 ms | p95 < 25 ms |
| Rebase three pending ordinary actions | p95 < 100 ms | p95 < 200 ms |
| Replay curated sample from genesis | < 1.5 s | < 3 s |
| Replay synthetic 500-cell room | < 3 s | < 6 s |
| Drag visual update | sustained usable 30+ FPS | sustained usable 30+ FPS |
| Initial non-AI first meaningful paint | < 2 s on normal broadband | < 3 s |

Treat these as gates for the sample, not universal platform promises. Record
actual hardware/browser.

## 19. Live OpenAI test policy

- opt-in command only;
- requires explicit `OPENAI_API_KEY` and budget flag;
- uses the prepared hero prompt and a small deterministic context;
- records model ID, latency, attempt count, tool validity, and final outcome;
- never logs key or capability secret;
- does not run on every CI push;
- one successful live production verification is required before submission.

## 20. Release validation matrix

| Claim | Required proof |
|---|---|
| Reversible language | rollback/redo/hash tests and inspector recording |
| No full replay in rebase | instrumentation test and two-client trace |
| Complete game | E2E victory/loss and manual 10–15 minute play |
| GPT-5.6 authors rule | live call, committed source, triggered effect |
| AI plays legally | legal options fixture plus live/model or fallback action |
| No-login production | clean-browser screenshot/E2E |
| Mobile works | mobile E2E and manual screenshot/video |
| Fallback works | AI-disabled E2E |
| No secrets | scans plus bundle inspection |
| Cloudflare persistence | DO tests, reload/reconnect evidence |
