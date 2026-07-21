# Board Game Computer

**Play the game. Rewrite the rules.**

Collect crystals, build your engine, and ask the table to add a new rule while you play. The production sample is **Prism Foundry**, an original two-player crystal-and-card engine builder powered by a live, reversible program.

Release state: **AWAITING OWNER PRODUCT APPROVAL**. M9 is intentionally not final and no submission tag has been created.

## Try the product

- Production: <https://boardgamecomputer.com/>
- Deterministic judging route: <https://boardgamecomputer.com/judge>
- Exact walkthrough: [JUDGING.md](JUDGING.md)

No login or user-provided API key is required. OpenAI calls are server-side. The deterministic fallback keeps the complete game playable when AI is disabled.

## 60–75 second hero path

1. Open `/judge`. The full table explains the goal and Mara's turn.
2. Select the highlighted Ruby and Sapphire stacks, then choose **Take Ruby + Sapphire**. Both tokens visibly move to Mara.
3. Ivo's mat enters a thinking state and GPT-5.6 Luna automatically chooses one legal move. A clearly labelled deterministic fallback keeps play moving if the request is unavailable.
4. Choose **Change a rule**. The compact Table Agent opens beside the table. Ask GPT-5.6 Designer for the prepared Ruby Resonance rule.
5. Close the drawer, inspect highlighted **Crimson Relay**, and choose **Buy**. Payment, card movement, discount, Prestige, market refill, and the rule-granted Prism animate on the table.
6. Choose **View source** to open Program beside the table at the exact appended cell. Continue playing to 8 Prestige, or inspect, undo, redo, share, and fork the room.

The bare `/` and `/judge` routes are local games. Choose **Create shared room** to get a persistent `/room/<roomId>` route and a separate Player invite link.

## Prism Foundry rules

- Mara and Ivo alternate one ordinary action.
- Take two different available Ruby, Sapphire, Emerald, or Amber tokens; or buy one affordable market card.
- Purchased cards permanently discount future costs of their color and grant Prestige.
- Prism tokens are wild payment. Prism cards gain one wild token; Echo cards grant another turn.
- The first player to reach at least 8 Prestige wins. Ordinary legal actions close after victory, but history tools remain available.

The complete rules and deterministic catalog contract are in [docs/13-SAMPLE-GAME-SPEC.md](docs/13-SAMPLE-GAME-SPEC.md).

## Why the technology matters

The room is one ordered append-only program. A custom TypeScript interpreter parses an Acorn AST and executes a deliberate JavaScript subset—never `eval` or `Function`. Every successful cell commits atomically with forward and inverse mutations. This makes local undo/redo, optimistic rollback, multiplayer rebase, replay inspection, and fork operate on patches instead of rebuilding ordinary state from scratch.

The server stores and globally orders cells but never executes game simulation. Deterministic clients receiving the same cells converge to the same state hash. React and PixiJS project the interpreted runtime; they are not a second canonical game model.

GPT-5.6 roles are deliberately narrow:

- **Designer (`gpt-5.6`)** proposes source. The browser validates and speculates it before commit.
- **Luna (`gpt-5.6-luna`)** chooses an opaque ID from registered legal options. It cannot invent an action.

## Local development

Requirements: Bun 1.2.5-compatible runtime and the checked-in lockfile.

```bash
bun install --frozen-lockfile
bun run dev
```

For local live AI only, put the server-side key in gitignored `.dev.vars`:

Add `OPENAI_API_KEY` to `.dev.vars`, alongside `AI_ENABLED=true`. Do not put a
sample or real key value in tracked documentation.

Never use a `VITE_` prefix for the key. The browser never calls OpenAI directly.

## Validation

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

`bun run validate` runs the complete non-live matrix. `bun run test:ai:live` is opt-in and requires the server credential. `bun run smoke:production` checks the deployed public routes.

## Architecture

```text
src/app/                    React surfaces and room client
src/render/                 Pixi projection of interpreted entities
src/geometry/               renderer-independent geometry
src/runtime/                parser, validator, interpreter, store, patches, sync
src/sample/prism-foundry/   executable genesis, projection, Designer boundary
src/worker/                 Worker routes, Durable Objects, server-side AI
tests/                      unit, Worker, desktop, mobile, room journeys
```

Current production source does not contain the rejected prior sample. Its commit history and [docs/16-HUMAN-UX-AUDIT.md](docs/16-HUMAN-UX-AUDIT.md) remain historical evidence only; [docs/17-PRODUCT-RESET.md](docs/17-PRODUCT-RESET.md) records the owner rejection and replacement gate.

## Security and provenance

- OpenAI credentials remain server-side in `.dev.vars` locally and Cloudflare Worker secrets in production.
- Room capability fragments are cooperative bearer links and are redacted from normal browser history.
- Logs omit authorization data and full capabilities.
- Secret and license scans are required before deployment.
- Prism Foundry names, text, vector art, and procedural components are original repository work.
- Preexisting-work disclosure: [docs/11-PREEXISTING-WORK-DISCLOSURE.md](docs/11-PREEXISTING-WORK-DISCLOSURE.md).
