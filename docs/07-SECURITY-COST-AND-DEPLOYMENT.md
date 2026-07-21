# Security, cost, and deployment design

## 1. Security posture

Board Game Computer is a cooperative game-prototyping room, not a hostile code-hosting
service or money-game platform. The Build Week implementation still protects
secrets, server resources, room integrity, and demo reliability.

### Explicit non-goals

- preventing a determined participant from inspecting full client data;
- cryptographic secrecy for hands;
- adversarial anti-cheat;
- arbitrary untrusted ECMAScript execution;
- multi-tenant code execution on the server;
- financial/wager-grade fairness.

The product must describe this honestly as a **cooperative playtesting security
model**.

## 2. Trust boundaries

### Interpreted source

Untrusted until parsed, validated, and executed in the custom runtime. It never
becomes native JavaScript and has no DOM/network/host capabilities.

### Browser application

Trusted to implement the deterministic runtime correctly. It can see the full
room log in MVP. It does not possess the OpenAI API key.

### Cloudflare Worker and Durable Objects

Trusted for authentication-by-capability, source validation, ordering,
persistence, AI orchestration, and budget enforcement. They never execute the
room program.

### OpenAI API

Receives only the context needed for the requested AI task. Model output is a
candidate, never an authority.

### Room participants

Possess Designer or Player capability links. They are assumed cooperative; the
server still prevents ordinary Player endpoints from submitting Designer code.

## 3. Interpreted-code controls

- Acorn AST node allowlist;
- custom values, scopes, heap, functions, and closures;
- no native `eval`, `Function`, prototypes, constructors, globals, or imports;
- no async, timers, promises, workers, DOM, storage, network, or OpenAI access;
- finite `for...of` only;
- static recursion rejection plus runtime fuel/call-depth limits;
- source, collection, trigger, heap, and cell limits;
- all host functions explicitly registered;
- host mutations require the open transaction;
- invariant checks before commit;
- exact rollback on error;
- role/cell-kind validation on both client and server.

Do not weaken these controls to accommodate a generated cell. Repair the cell
or reduce its goal.

## 4. Room capability design

### IDs and secrets

- room ID: high-entropy random identifier, safe to appear in URL path;
- Designer capability: independent high-entropy random secret;
- Player capability: independent secret, optionally seat-specific;
- server stores only cryptographic hashes;
- compare hashes in constant-time style where practical;
- capability rotation/revocation is optional but schema should allow it.

### URLs

Preferred shape:

```text
/room/<room-id>#designer=<secret>
/room/<room-id>#player=<secret>
```

Fragments are not sent in the initial HTTP request. Client reads the fragment,
opens a connection, and sends the capability during the protected join
protocol. Remove or mask it from visible UI after storage in memory/session
state. Never print it in logs, screenshots, analytics, or error reports.

### Authorization

- Designer: `code`, `action`, `chat`, fork/export, share management;
- Player: allowed `action`, `chat`, read/replay/fork as configured;
- system/template cells: server/internal path only;
- AI Designer operates under a Designer request initiated by a Designer;
- AI player operates for its assigned seat and returns only a registered
  action.

## 5. Room-integrity limits

Server-enforced defaults from `.env.example`:

- maximum cell bytes;
- maximum room cells;
- maximum chat bytes;
- commands per minute;
- maximum WebSocket connections;
- supported language/framework versions;
- idempotency key uniqueness;
- monotonic sequence and exact base sequence;
- at most one canonical proposal in flight per client/room; later optimistic
  actions remain queued locally until commit or rebase;
- shared static validator;
- JSON/protocol schema validation.

A malicious cooperative client could still attest an incorrect state hash.
Other clients detect divergence and recover; the server does not claim to
verify game semantics.

## 6. AI request boundary

### Secrets

- `OPENAI_API_KEY` is a Cloudflare secret only;
- never prefix it with `VITE_` or expose it to client build;
- browser calls project Worker endpoints, not OpenAI;
- CI live tests use a protected secret and are opt-in.

### Input minimization

Never send:

- capability tokens;
- authorization headers;
- Cloudflare/GitHub credentials;
- unrelated user data;
- browser storage;
- hidden chain-of-thought requests.

Send only room source, runtime inspection, legal actions, user request, and
structured diagnostics needed for the task.

### Output controls

- strict function schema;
- complete tool arguments before use;
- local parse, static validation, speculative execution, triggers, invariants;
- current base sequence/hash revalidation;
- maximum three repairs;
- no failed candidate in room history;
- timeout and cancellation;
- deterministic fallback.

### Safety identifier

If the API integration supports/stabilizes it during implementation, send a
stable privacy-preserving per-room or per-client `safety_identifier`, never a
raw capability or personal identifier.

## 7. Rate and cost controls

### Per-room

Track in the Room Durable Object or Budget guard:

- AI requests per rolling hour;
- repair attempts;
- active request count;
- input-size maximum;
- cooldown after repeated failures.

### Global

A singleton `BudgetObject` tracks UTC-day counters:

- request count;
- estimated input tokens/characters;
- attempts by model;
- optional actual usage from API responses;
- hard disabled state.

Environment kill switches:

- `AI_ENABLED=false` disables live calls;
- `AI_MAX_REQUESTS_PER_DAY`;
- `AI_MAX_ESTIMATED_INPUT_TOKENS_PER_DAY`;
- `AI_MAX_REQUESTS_PER_ROOM_PER_HOUR`.

The judge path should consume a small bounded number of calls: one Designer
request with up to three attempts and one or a few AI-player decisions.

### Model routing

- `gpt-5.6` for the showcased Designer rule because quality matters;
- `gpt-5.6-luna` for frequent legal-action selection;
- reasoning effort defaults to medium for Designer and may be lower for Player;
- configuration is server-side;
- no automatic escalation loop beyond documented attempts.

Monitor the current OpenAI pricing/limits before release rather than embedding
a fixed cost promise in submission copy.

## 8. Data storage and retention

### Room Durable Object

Stores:

- room metadata;
- capability hashes;
- committed cells and server timestamps;
- attested head state hash;
- fork parent metadata;
- minimal connection metadata through WebSocket attachments.

Does not store:

- OpenAI API key;
- interpreted heap or trusted executable snapshots in MVP;
- raw capability secrets;
- hidden reasoning;
- unnecessary browser/device data.

### Chat and prompts

Chat is part of the room program and is therefore persistent by product design.
The UI should state that room participants with the link can view room history.
Do not collect unrelated analytics text. Failed model candidates should not be
persisted in the committed room log; diagnostic telemetry should be minimal
and sampled.

### Deletion

Build Week does not require a full account deletion system. Provide at least:

- room reset/fresh copy;
- optional Designer-only delete endpoint if inexpensive and safe;
- operational ability to purge demo/test rooms from Cloudflare storage.

## 9. Logging and observability

Allowed structured fields:

- event type;
- room ID or hashed room ID;
- sequence number;
- language/framework version;
- model ID;
- latency and attempt count;
- error code;
- fallback flag;
- cell size;
- state-hash prefix for debugging.

Redact or omit:

- capability secrets/fragments;
- API keys/tokens;
- authorization headers;
- full prompts/source by default;
- personal identifiers;
- complete room URLs containing fragments.

Use sampling for high-frequency success events. Preserve enough errors to
support the submission period without exposing content.

## 10. Browser and web security

- serve over HTTPS only in production;
- security headers where compatible: CSP, `X-Content-Type-Options`, sensible
  `Referrer-Policy`, frame restrictions unless embedding is deliberately added;
- no inline secret-bearing scripts;
- validate all URL/JSON inputs;
- React renders model summaries as text, not HTML;
- never pass model output to `dangerouslySetInnerHTML`;
- sanitize/download export filenames;
- no third-party analytics or scripts in mandatory path unless explicitly
  reviewed;
- room WebSocket endpoints validate origin and capability;
- CORS limited to production/local configured origins.

## 11. Dependency and supply-chain controls

- commit Bun lockfile;
- add dependencies only with clear need and compatible license;
- prefer official OpenAI/Cloudflare SDKs;
- avoid abandoned runtime/sandbox dependencies;
- run license checker before each release;
- use pinned major versions in CI actions;
- review GitHub Actions permissions and use least privilege;
- do not execute remote install scripts in CI.

## 12. Deployment topology

```text
GitHub main
  → CI validation
  → production build
  → Cloudflare version upload/deploy
      ├─ static React assets
      ├─ Worker HTTP/SSE routes
      ├─ Room Durable Object namespace (SQLite)
      └─ Budget Durable Object namespace (SQLite or storage API)
```

Use the Cloudflare Vite plugin for local production-like Worker development.
Use the official Cloudflare GitHub Actions deployment pattern or Workers Builds
if it provides equivalent reproducibility; the user requested GitHub Actions,
so GitHub Actions is the default source of deployment truth.

## 13. Cloudflare configuration requirements

Wrangler configuration must include:

- current compatibility date selected during M1;
- static assets/Vite plugin integration;
- `ROOMS` Durable Object binding;
- `AI_BUDGET` Durable Object binding;
- SQLite migration entries for new classes;
- environment variables with non-secret defaults;
- secrets configured separately;
- preview and production environments if useful;
- observability/log configuration without secret content.

Do not rely on server-side execution of room source; Cloudflare restrictions on
native dynamic code are irrelevant to the client interpreter design.

## 14. GitHub Actions

### Validation workflow

On pull request and `main`:

1. checkout;
2. install Bun;
3. `bun install --frozen-lockfile`;
4. `bun run validate`;
5. build artifact;
6. upload test artifacts/evidence as appropriate.

### Deploy workflow

On protected `main` after validation:

1. build;
2. deploy/upload Cloudflare version using official action or Wrangler;
3. run health and judge-route smoke checks;
4. record deployment URL/version;
5. fail without promoting if smoke check fails where versioned deployment is
   available.

Required GitHub secrets:

- `CLOUDFLARE_ACCOUNT_ID`;
- `CLOUDFLARE_API_TOKEN` with only required Workers permissions.

`OPENAI_API_KEY` should be configured as a Cloudflare secret, not necessarily
passed through every GitHub build.

## 15. Deployment rollback

Before final release:

- verify Cloudflare version history/deployments;
- know the command/dashboard action to restore the prior known-good version;
- do not overwrite the submission tag;
- keep the previous production version available until the new one passes
  `JUDGING.md`;
- after deadline, avoid risky deployments over the submission release.

## 16. Production no-friction requirements

- no login;
- no user API key;
- no payment;
- no CAPTCHA or interactive Cloudflare challenge;
- no bot/WAF rule that blocks browser automation;
- immutable demo template and fresh personal room;
- value visible before AI latency;
- API failure does not blank the app;
- rate limits allow ordinary judge repetition.

## 17. Asset and IP controls

- original game name, rules, text, and code;
- no commercial tabletop names in shipped UI/metadata;
- no copied rulebook text or art;
- no copyrighted music in product/video;
- AI-generated art gets prompt/date/model/file provenance;
- primitive fallback remains original;
- dependency licenses recorded in `THIRD_PARTY_NOTICES.md`;
- prior prototype disclosure stays accurate.

## 18. Incident checklist

If production shows secret exposure, runaway cost, corrupt rooms, or broad
failure:

1. disable AI with kill switch or rotate OpenAI key;
2. revoke/rotate affected Cloudflare/GitHub token;
3. roll back to last known-good version;
4. preserve non-secret diagnostics;
5. purge exposed logs/artifacts where possible;
6. fix and rerun full validation;
7. update evidence and known risks honestly.

## 19. Pre-release security verification

- `bun run secrets:check` passes;
- manual bundle/source-map search passes;
- capability token is absent from logs;
- Player code cell is server-rejected;
- oversized/malformed protocol input is rejected;
- model output is rendered as text and validated as source;
- AI budget kill switch works;
- OpenAI-disabled judge path works;
- dependency/license review passes;
- production headers/origin/CORS/WebSocket checks pass;
- clean browser needs no credentials.

## 20. Current official technical references

- GPT-5.6 guidance: https://developers.openai.com/api/docs/guides/latest-model
- Responses API: https://developers.openai.com/api/docs/guides/migrate-to-responses
- Function calling: https://developers.openai.com/api/docs/guides/function-calling
- Streaming: https://developers.openai.com/api/docs/guides/streaming-responses
- Rate limits: https://developers.openai.com/api/docs/guides/rate-limits
- Cloudflare Vite plugin: https://developers.cloudflare.com/workers/vite-plugin/
- Durable Objects: https://developers.cloudflare.com/durable-objects/
- Durable Object WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Workers Vitest integration: https://developers.cloudflare.com/workers/testing/vitest-integration/
- GitHub Actions deployment: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
