# AGENTS.md — Board Game Computer Build Week implementation contract

## Mission

Build **Board Game Computer**, a live shared tabletop where people and GPT-5.6 create,
play, and change a game through the same reversible JavaScript-shaped command
language.

The repository starts with a frozen product and architecture design. Do not
reinterpret the product, replace the execution model, or expand scope without
an explicit user decision recorded in `docs/03-DECISION-LOG.md`.

## Source of truth

Read these files completely before changing code, in this order:

1. `AGENTS.md`
2. `docs/00-COMPETITION-CONSTRAINTS.md`
3. `docs/01-PRODUCT-BRIEF.md`
4. `docs/02-UX-AND-DEMO-FLOW.md`
5. `docs/03-DECISION-LOG.md`
6. `docs/04-TECHNICAL-DESIGN.md`
7. `docs/12-LANGUAGE-AND-FRAMEWORK-REFERENCE.md`
8. `docs/13-SAMPLE-GAME-SPEC.md`
9. `docs/05-IMPLEMENTATION-PLAN.md`
10. `docs/06-TEST-PLAN.md`
11. `docs/07-SECURITY-COST-AND-DEPLOYMENT.md`
12. `docs/08-SUBMISSION-EVIDENCE.md`
13. `docs/11-PREEXISTING-WORK-DISCLOSURE.md`
14. `STATUS.md`

If documents conflict, stop only for a material contradiction. Otherwise use
this precedence:

1. accepted decisions in `docs/03-DECISION-LOG.md`;
2. frozen scope in `docs/01-PRODUCT-BRIEF.md`;
3. technical invariants in `docs/04-TECHNICAL-DESIGN.md`;
4. milestone-specific instructions in `docs/05-IMPLEMENTATION-PLAN.md`.

## Product invariants

These are not optional implementation details:

- The room is an ordered program made of append-only cells.
- The client runs a custom TypeScript interpreter over an Acorn AST.
- The supported language is a deliberate JavaScript subset, not native `eval`.
- Every successful cell is atomic and records forward and inverse mutations.
- Undo, redo, optimistic rollback, and rebase operate on patches; ordinary
  multiplayer must not replay the whole room.
- Keep at most one canonical cell proposal in flight per client/room. Later
  optimistic actions remain queued locally until commit or rebase.
- The server accepts executable cells only at the current `headSeq`; stale
  bases are returned for revalidation and never appended.
- The server stores and orders cells but never executes the game simulation.
- All deterministic clients receiving the same ordered cells must converge to
  the same state hash.
- Players use registered actions; Designers may submit general allowed source.
- GPT-5.6 produces candidate source or chooses a registered action. Model
  output is never committed without local parse, validation, and execution.
- PixiJS is a replaceable renderer only. Geometry and game semantics are
  independent TypeScript modules.
- The first sample is a complete 10–15 minute game with a real ending.
- The main URL and `/judge` open without login or a user-provided API key.

## Frozen scope

### Required

- deployable React/TypeScript web app on Cloudflare Workers;
- reversible AST interpreter and deterministic runtime;
- top-down PixiJS tabletop with custom vector geometry;
- complete `Shifting Vaults` sample game;
- guided replay, takeover, live Designer-agent rule change, and continued play;
- one AI player using registered legal actions;
- persistent room URL and reset/fresh-copy path;
- responsive desktop and mobile judge path;
- deterministic fallback when OpenAI is unavailable;
- tests, evidence, README, judging guide, and release tag.

### Supporting features, in priority order

1. room sharing with two connected browser clients and optimistic rebase;
2. replay timeline and `Fork from here`;
3. static AI-generated sample art with primitive fallback.

### Kill list

Do not add these before submission unless an equivalent amount of frozen scope
is removed and the user accepts the decision:

- a second sample game;
- a block editor or Droplet port;
- a separate Gherkin parser;
- Game Master role;
- enforced secrecy or anti-cheat;
- accounts, profiles, library, gallery, marketplace, or payments;
- PDF/rulebook import;
- voice input, in-app audio, or video chat;
- runtime image generation;
- presence cursors or locking;
- CRDTs or general operational transformation for arbitrary code;
- 3D, isometric rendering, or a physics engine;
- arbitrary native JavaScript, WebAssembly, `eval`, or `Function`;
- full deck-building framework or automated balance simulation.

## Target repository layout

The exact file names may evolve within a milestone, but preserve these module
boundaries:

```text
src/
  app/                    React UI, routing, responsive layout
  render/                 Pixi adapter, scene projection, animation
  geometry/               renderer-independent paths and hit testing
  runtime/
    parser/               Acorn parsing and source diagnostics
    validator/            supported AST and capability validation
    interpreter/          AST evaluation and control flow
    store/                scopes, slots, heap, transaction journal, patches
    framework/            entities, zones, actions, BDD, turns, RNG
    sync/                 pending stack, rollback, rebase, state hash
  sample/                 Shifting Vaults source cells and fixtures
  shared/                 protocol schemas and common types
  worker/
    index.ts              HTTP/SSE/WebSocket routing
    room-object.ts        room Durable Object
    budget-object.ts      global AI budget guard
    ai/                   Responses API orchestration and prompt assembly
scripts/                  validation, evidence, and license tooling
tests/
  unit/
  integration/
  e2e/
public/
  assets/
```

Do not let React state, Pixi objects, or network payloads become the canonical
game state. `RoomRuntime` is the client-side deterministic authority.

## Required commands

Milestone 1 must create and keep these commands working:

```bash
bun install --frozen-lockfile
bun run dev
bun run format
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run test:workers
bun run test:e2e
bun run build
bun run validate
bun run deploy
bun run secrets:check
bun run licenses:check
```

`bun run validate` must run all non-live checks required before a commit.
A separate opt-in command may run live OpenAI tests and must never be required
for ordinary CI.

## Engineering conventions

- TypeScript strict mode; no unchecked `any` in runtime, protocol, or AI paths.
- Prefer discriminated unions and exhaustive switches.
- Runtime values are custom serializable values, never arbitrary host objects.
- All mutations of interpreted state go through `TransactionalStore`.
- Host framework functions must be pure or transaction-aware.
- Parse each cell once and retain source locations for diagnostics.
- Every protocol message is schema-validated at the boundary.
- Use stable IDs; never use array index as persistent identity.
- Randomness uses the framework PRNG only.
- Time used by game rules is explicit game time, not `Date.now()`.
- Keep renderer and geometry replaceable and independently tested.
- Keep AI prompts and schemas versioned in source control.
- Avoid dependencies when a small local module is clearer; document every
  dependency and license in `THIRD_PARTY_NOTICES.md`.

## Secrets and privacy

- Never commit `.env`, `.dev.vars`, API keys, tokens, room capability secrets,
  or private Codex Session IDs.
- `OPENAI_API_KEY` exists only in Cloudflare/server environments.
- The browser never calls OpenAI directly.
- GitHub deployment credentials are repository secrets.
- Logs must omit full capability tokens, API keys, and unredacted headers.
- Room links are cooperative capability links, not wager-grade security.

## Milestone workflow

For every milestone in `docs/05-IMPLEMENTATION-PLAN.md`:

1. Set its row in `STATUS.md` to `in progress`.
2. Implement only that milestone's scope.
3. Add or update tests.
4. Run every listed validation command.
5. Fix failures before continuing.
6. Review the diff for scope creep, secrets, and accidental mock behavior.
7. Update docs and `STATUS.md` with actual results.
8. Record concrete evidence in `docs/08-SUBMISSION-EVIDENCE.md`.
9. Commit with the specified message.
10. Move to the next milestone without asking for confirmation unless a true
   blocker exists.

A true blocker is limited to missing credentials, an irreversible external
action, a material source-of-truth contradiction, a technically impossible
requirement, or a credible secret/cost risk.

## Validation policy

- A milestone is not done while any required validation fails.
- Do not silence tests, weaken assertions, or remove functionality to make CI
  green without documenting and accepting a cut decision.
- Mocks are allowed in tests and explicitly labelled fallback paths only.
- Never present a static response as a live GPT-5.6 result.
- Keep the deterministic sample playable when OpenAI is disabled.
- Test desktop and mobile judge paths before declaring the UI complete.
- Test two-browser convergence before declaring multiplayer complete.

## Definition of done

The project is complete only when all of the following are true:

- production URL works in a clean browser without login or BYOK;
- `JUDGING.md` succeeds literally from start to finish;
- the guided replay visibly links cells to deterministic table changes;
- a human takes control and completes a legal action;
- the AI player makes a legal action;
- GPT-5.6 adds the showcased rule through validated source;
- the new rule visibly fires and the game can still reach a real ending;
- API timeout/failure leaves a playable deterministic fallback;
- reset/fresh copy works;
- required validation commands pass;
- no secrets are tracked or present in the browser bundle;
- README and evidence contain only verified claims;
- the submission commit is tagged `build-week-submission`.

Do not announce completion before this definition is satisfied.
