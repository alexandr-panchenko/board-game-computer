# Technical design

## 1. System goal

Implement a deterministic, reversible, browser-side tabletop runtime whose
source of truth is an ordered sequence of source cells. Humans and GPT-5.6 use
the same language boundary. Cloudflare provides room ordering, persistence,
reconnect, AI orchestration, and budget controls, but never evaluates the game.

## 2. Chosen stack

| Layer | Choice |
|---|---|
| Package manager/task runner | Bun |
| Client UI | React + TypeScript + Vite |
| Cloudflare integration | Cloudflare Vite plugin + Workers |
| Rendering | PixiJS behind `TableRenderer` |
| Geometry | custom renderer-independent TypeScript kernel |
| Parser | Acorn + acorn-walk |
| Language execution | custom TypeScript AST interpreter |
| Client state authority | `RoomRuntime` transactional store |
| Room server | SQLite-backed Durable Object |
| Realtime | Durable Object Hibernatable WebSockets |
| AI | OpenAI Responses API |
| Designer model | `gpt-5.6` alias |
| AI-player model | `gpt-5.6-luna` |
| Boundary schemas | TypeScript plus Zod or equivalent explicit validators |
| Unit tests | Vitest |
| Worker tests | `@cloudflare/vitest-pool-workers` |
| Browser E2E | Playwright |
| CI/CD | GitHub Actions + official Cloudflare Wrangler action/workflow |

Use current compatible stable versions and commit the Bun lockfile. Do not
change the stack after M1 without an accepted decision.

## 3. High-level architecture

```text
Browser client
├─ React host application
│  ├─ route/template loader
│  ├─ Chat and AI job UI
│  ├─ Script/REPL and diagnostics
│  ├─ Timeline/trace
│  └─ room WebSocket client
├─ RoomRuntime
│  ├─ Cell parser and AST cache
│  ├─ language/capability validator
│  ├─ AST interpreter
│  ├─ scopes, slots, heap, functions, closures
│  ├─ transactional journal
│  ├─ forward/inverse patch history
│  ├─ framework registries and deterministic RNG
│  ├─ state hashing and inspections
│  └─ optimistic pending stack/rebase
├─ GeometryKernel
└─ TableRenderer (Pixi implementation)

Cloudflare Worker
├─ static app/assets
├─ API routing
├─ SSE AI endpoints
├─ strict model tool schemas and prompt assembly
├─ shared static source validation
├─ Room Durable Object namespace
└─ Budget Durable Object namespace

Room Durable Object
├─ room metadata and capability hashes
├─ ordered cell table
├─ monotonic sequence assignment
├─ idempotency/deduplication
├─ WebSocket client attachments
├─ broadcast/reconnect tail
└─ fork/export endpoints
```

## 4. Source-of-truth model

### 4.1 Server source of truth

The server stores the canonical globally ordered sequence of cells and room
metadata. It does not store or certify the materialized game state.

### 4.2 Client source of truth

Within a connected client, the interpreted transactional store is the live
materialization of the confirmed prefix plus local pending cells.

### 4.3 Determinism contract

Two clients with the same:

- language version;
- framework version;
- sample/template version;
- ordered executable cells;
- deterministic inputs and RNG seed;

must produce the same canonical state hash.

The hash excludes UI selection, animation progress, pointer previews, WebSocket
metadata, timestamps that are not explicit game values, and Pixi objects.

## 5. Cell model

```ts
type CellKind = "system" | "code" | "action" | "chat";
type RoomRole = "designer" | "player";

interface CellProposal {
  commandId: string;          // client-generated UUID, idempotency key
  roomId: string;
  baseSeq: number;
  baseStateHash: string;
  kind: CellKind;
  source?: string;            // required for executable cells
  chatText?: string;          // required for chat cells
  author: {
    clientId: string;
    seatId?: string;
    role: RoomRole;
    displayName?: string;
  };
  clientLanguageVersion: string;
  clientFrameworkVersion: string;
  proposedPostStateHash?: string;
  metadata?: Record<string, JsonValue>;
}

interface CommittedCell extends CellProposal {
  seq: number;
  committedAt: string;        // server timestamp; not game time
  sourceHash?: string;
  canonicalPostStateHash?: string;
}
```

### Cell rules

- one proposal is one atomic cell;
- `chat` does not execute but belongs in timeline order;
- `action` source must be an exact restricted `performAction` invocation;
- `code` is allowed only for Designer capabilities;
- `system` exists only in trusted templates/internal flows;
- failed candidate cells never receive `seq` and never enter the committed log;
- nested triggers are execution trace entries, not separately interruptible
  cells.

## 6. Parser and validator

### 6.1 Parsing

Acorn parses each source cell once with source locations. ASTs are cached by
`sourceHash`. The parser configuration is versioned.

### 6.2 Supported-language validation

The validator walks the AST and rejects unsupported or dangerous constructs
before execution. Exact syntax is in
`docs/12-LANGUAGE-AND-FRAMEWORK-REFERENCE.md`.

Validation includes:

- node-type allowlist;
- property-name restrictions;
- no native global access;
- no imports, async, generators, `new`, classes, `this`, or prototypes;
- no `while`, classic `for`, or `do...while`;
- no direct or statically visible mutual recursion;
- source and collection size limits;
- role/cell-kind capability shape;
- static `action` cell shape verification.

The runtime still enforces fuel and call-depth limits because static recursion
analysis is not a proof for all dynamic call graphs.

### 6.3 Client/server validation split

The same pure validator module is built into browser and Worker:

- client validation gives immediate diagnostics and guards speculative execute;
- server validation rejects malformed or capability-violating source before
  ordering;
- only the client performs semantic execution.

## 7. Runtime value system

Interpreted code never receives arbitrary JavaScript host objects.

```ts
type RuntimeValue =
  | { type: "undefined" }
  | { type: "null" }
  | { type: "boolean"; value: boolean }
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "object"; objectId: ObjectId }
  | { type: "function"; functionId: FunctionId }
  | { type: "native-function"; nativeId: NativeFunctionId };
```

Runtime numbers must reject non-finite results before commit unless a specific
framework API documents them. Plain records and arrays live in the runtime
heap. Entity, zone, player, card, and path references are branded runtime
records with stable IDs, not host object references.

## 8. Scopes, bindings, functions, and closures

```ts
interface RuntimeScope {
  id: ScopeId;
  parentId: ScopeId | null;
  bindings: Map<string, SlotId>;
}

interface RuntimeSlot {
  id: SlotId;
  initialized: boolean;
  mutable: boolean;
  value: RuntimeValue;
}

interface InterpretedFunction {
  id: FunctionId;
  name?: string;
  parameters: PatternNode[];
  bodyRef: AstNodeRef;
  closureScopeId: ScopeId;
}
```

Closures capture scope IDs whose slots are controlled by the transaction store.
This is the key reason rollback works: no mutable lexical state is hidden inside
the native JavaScript engine.

The interpreter needs completion records for normal, return, break, continue,
and throw/error propagation. `try/catch` is not required in the first language
version.

## 9. Transactional store and reversible patches

### 9.1 Invariant

Every interpreted mutation, framework mutation, registry change, RNG advance,
and allocation-counter change passes through one `Transaction`.

```ts
interface RuntimeTransaction {
  cellId: string;
  mutations: Mutation[];
  trace: TraceEvent[];
  changedIds: Set<string>;
  status: "open" | "committed" | "rolled-back";
}
```

### 9.2 Mutation types

At minimum:

- create/delete binding;
- set slot value or initialization state;
- allocate/delete scope;
- allocate/delete heap object;
- set/delete object property;
- set array length/index/splice result;
- allocate/delete function;
- register/replace/remove Action;
- register/replace/remove Scenario or Invariant;
- set framework field;
- advance/restore RNG state;
- advance/restore stable ID allocator;
- enqueue/dequeue trigger event.

Each mutation records enough `before` and `after` data to apply in either
direction.

### 9.3 Commit

```text
begin transaction
→ interpret cell
→ flush deterministic trigger queue
→ evaluate invariants
→ compute trace/change set/state hash
→ commit mutation list
→ derive forward and inverse patch
```

No renderer update becomes canonical before commit.

### 9.4 Failure

Any parse, validation, runtime, fuel, trigger, or invariant error:

- applies the transaction mutations in reverse;
- restores RNG and allocators;
- produces diagnostics with source and trace context;
- proves the pre-cell hash is unchanged;
- does not create a committed cell.

### 9.5 Patch structure

```ts
interface RuntimePatch {
  cellId: string;
  direction: "forward" | "inverse";
  mutations: ReadonlyArray<SerializedMutation>;
  fromStateHash: string;
  toStateHash: string;
  traceSummary: TraceSummary;
}
```

Patches are client/session artifacts in MVP. The Durable Object stores source
cells, not trusted patches.

## 10. Interpreter execution limits

- fuel consumed per AST node;
- higher explicit costs for expensive host primitives;
- maximum call depth;
- maximum finite collection size for `for...of` and callback methods;
- maximum trigger cascade steps;
- maximum heap objects and cell size;
- no async, timers, promises, network, DOM, or native iterators;
- no recursion as a supported language feature;
- deterministic error codes for agent repair.

Common game actions should call native framework/geometry primitives rather
than execute large algorithms in interpreted source.

## 11. Framework architecture

### 11.1 Registries

Transactional registries contain:

- entities/components;
- zones and path geometry;
- players, seats, teams, and roles;
- turn/phase state;
- actions;
- scenarios/triggers;
- invariants;
- decks/bags and deterministic random state;
- objective/winner state;
- presentation metadata.

### 11.2 Actions

An `Action` defines:

- stable ID and label;
- parameter/choice providers;
- availability predicate;
- effect function;
- actor role/seat constraints;
- UI affordance metadata;
- optional specialized rebase policy.

The runtime materializes a finite list of legal action options for a seat. The
renderer and AI layer consume the same list.

### 11.3 Events and Scenarios

Framework operations emit deterministic events into a FIFO transaction-local
queue. Scenarios match events and enqueue effects. Triggers execute in stable
registration order, then stable event order. Maximum cascade limits prevent
unbounded behavior.

### 11.4 Invariants

Invariants run after all triggers and before commit. They can validate rules
such as unique ownership, non-negative counters, valid turn actor, or complete
room references. An invariant failure rolls back the whole cell.

### 11.5 Deterministic random

Use a small explicitly versioned PRNG with serializable state. All shuffles,
draws, dice, and bag selections use it. The PRNG state is part of patches and
state hashes.

## 12. Geometry kernel

Geometry is independent from PixiJS and the interpreter. Interpreted code calls
transaction-aware/pure host primitives by stable references.

### Segment types

- line segment;
- cubic Bézier segment;
- circular/elliptical arc segment;
- closed/open path;
- 2D transform and bounds.

### Required operations

- transform path;
- bounds and broad-phase AABB;
- point-on/point-in path;
- segment/path intersection;
- path containment and overlap ratio;
- nearest point/edge;
- anchor-inside, fully-inside, and intersects relations;
- z-ordered hit selection;
- topology helpers for room-edge connections.

Use robust tolerance-based math and adaptive subdivision for curved narrow
phase where exact closed forms are not practical. Do not use pixel-color hit
testing as game truth.

## 13. Renderer boundary

```ts
interface TableRenderer {
  mount(container: HTMLElement): void;
  applyCommittedChanges(changeSet: RuntimeChangeSet): void;
  applyInverseChanges(changeSet: RuntimeChangeSet): void;
  previewDrag(preview: DragPreview): void;
  clearPreview(): void;
  focusTrace(trace: TraceEvent[]): void;
  resize(viewport: Viewport): void;
  destroy(): void;
}
```

PixiJS objects are projections keyed by stable entity/zone IDs. Rendering and
animations do not mutate runtime state. If Pixi integration becomes a blocker,
replace the adapter with Canvas 2D without changing geometry/runtime APIs.

## 14. Optimistic client synchronization

Client state consists of:

```text
confirmed runtime at confirmedSeq
+ ordered local pending transactions
= speculative visible runtime
```

### Local proposal

1. Validate and execute against the current speculative runtime.
2. Keep the forward/inverse patch in the ordered pending stack.
3. Render the result immediately when appropriate.
4. Maintain at most **one canonical proposal in flight per client/room**.
   Later local actions may remain visible and queued as pending transactions,
   but are not sent until the earlier proposal is committed or rebased.
5. Send the oldest unsent proposal with the exact confirmed `baseSeq` and
   `baseStateHash` on which it was semantically validated.

### Server accepts with no interleaving

The room accepts an executable proposal only when `baseSeq === headSeq` and the
submitted base hash matches the room's stored head-hash attestation. Otherwise
it returns `rebase_required` without appending the cell. This prevents an
ordinary race from placing a command in the canonical log before a
well-behaved client has revalidated it against the current head.

On acceptance:

- assign the next `seq`;
- persist and broadcast;
- proposer removes the matching pending entry without re-executing;
- proposer sends the next queued pending proposal only after updating its base;
- other clients execute the authoritative cell;
- clients report/compare the resulting hash.

The server still cannot prove semantic correctness against game state; that is
an explicit cooperative-trust limitation. A malformed or adversarial client is
out of scope, while deterministic clients and state-hash comparison detect
implementation divergence.

### Authoritative cell arrives before pending proposals

1. Apply pending inverse patches in reverse order.
2. Confirm base hash.
3. Execute authoritative cell and store its committed patch.
4. Re-execute pending proposals in original order.
5. Keep valid new patches.
6. Reject or repair proposals that are no longer valid.
7. Render the net change.

Only the short pending tail is re-executed. Ordinary committed history is not.

### Semantic conflicts

General source cannot always be transformed automatically. A failed re-execute
returns a conflict diagnostic. Registered actions may define narrow policies:
`reapply`, `reject-on-write-conflict`, `global-order-wins`, or a future custom
transform.

## 15. State hash and divergence recovery

Canonical serialization sorts object IDs, keys, registry IDs, and arrays in
specified order. It includes all game-relevant runtime values and versions.

Each proposer sends `baseStateHash` and proposed post hash. The room stores the
accepted post hash as an attestation, not as independently verified truth.
Other clients compare after execution.

On mismatch:

- pause new optimistic commands;
- request the authoritative cell prefix/tail;
- rebuild a fresh runtime from source cells;
- compare again;
- show recovery status and record non-secret diagnostics.

Full replay is an exceptional recovery/load operation, not the ordinary rebase
path.

## 16. Time travel and fork

The client retains committed forward/inverse patches for the current loaded
history.

- previous: apply inverse patch;
- next: apply forward patch;
- return live: redo to head;
- inspect history: local only;
- persist from past: create a child room from selected prefix;
- arbitrary deletion of an old cell while retaining dependent suffix is not
  supported.

New clients initially replay source once. Server-side executable snapshots are
not required for MVP. A future serialized runtime checkpoint is possible
because scopes, heap, functions, AST references, and registries are controlled.

## 17. Durable Object design

### SQLite tables

```sql
CREATE TABLE rooms (
  room_id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  head_seq INTEGER NOT NULL,
  head_state_hash TEXT,
  language_version TEXT NOT NULL,
  framework_version TEXT NOT NULL,
  designer_cap_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  parent_room_id TEXT,
  parent_seq INTEGER
);

CREATE TABLE cells (
  seq INTEGER PRIMARY KEY,
  command_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  source TEXT,
  chat_text TEXT,
  source_hash TEXT,
  author_json TEXT NOT NULL,
  metadata_json TEXT,
  base_state_hash TEXT,
  post_state_hash TEXT,
  committed_at TEXT NOT NULL
);

CREATE TABLE player_capabilities (
  cap_hash TEXT PRIMARY KEY,
  seat_id TEXT,
  role TEXT NOT NULL,
  revoked_at TEXT
);
```

Use prepared statements and size limits. Each room is one Durable Object.

### WebSocket protocol

Server-to-client:

- `room.snapshot` — metadata plus ordered cells for initial load;
- `room.cells` — missing committed tail;
- `cell.committed`;
- `cell.rebase_required`;
- `cell.rejected`;
- `state.hash_mismatch`;
- `room.error`;
- optional ephemeral `drag.preview`.

Client-to-server:

- `room.join` with capability;
- `cell.propose`;
- `room.tail.request`;
- `state.hash.report`;
- optional `drag.preview`;
- `room.fork.request` through HTTP or WebSocket.

Store client metadata with WebSocket attachments for hibernation recovery.

## 18. Capabilities and cooperative trust

- Room IDs are random and non-guessable.
- Designer and Player secrets are separate random values.
- Store only cryptographic hashes of capabilities.
- Prefer fragments in shared URLs so raw secrets do not enter ordinary server
  request logs; client sends the secret during join.
- Server checks role before accepting cell kind.
- Player source must match the restricted action-call AST.
- Full source may still reach Player clients; no anti-cheat guarantee.

## 19. OpenAI integration

### Designer endpoint

Input:

- user request;
- current room versions;
- full source log within configured limit;
- runtime inspection summary;
- supported language/framework reference;
- examples and exact forbidden constructs;
- current base sequence/hash;
- prior structured diagnostics for repair attempts.

Responses API tool:

```json
{
  "type": "function",
  "name": "propose_room_cell",
  "description": "Propose one Board Game Computer Designer cell for local validation.",
  "strict": true,
  "parameters": {
    "type": "object",
    "additionalProperties": false,
    "required": ["source", "summary", "expected_effects"],
    "properties": {
      "source": { "type": "string" },
      "summary": { "type": "string" },
      "expected_effects": {
        "type": "array",
        "items": { "type": "string" }
      }
    }
  }
}
```

All properties are required because strict function calling requires a closed
schema. `expected_effects` may be an empty array. Force this tool for the
Designer request and set `parallel_tool_calls: false` so one attempt yields at
most one candidate cell.

Flow:

1. Worker streams progress/response events.
2. Browser receives complete candidate.
3. Browser parser/validator/interpreter runs speculative transaction.
4. On success, browser proposes cell to room.
5. On failure, browser posts structured diagnostics for repair.
6. Maximum three attempts.
7. If base changed, revalidate against current speculative runtime before
   commit.

### AI-player endpoint

Input contains concise public runtime inspection plus fully materialized legal
action options. Each option has a stable opaque `optionId`, label, concise
consequence summary, and the literal action/arguments retained locally. The
strict tool returns only:

```json
{
  "type": "function",
  "name": "choose_legal_action",
  "description": "Choose exactly one currently offered legal action option.",
  "strict": true,
  "parameters": {
    "type": "object",
    "additionalProperties": false,
    "required": ["option_id", "reason"],
    "properties": {
      "option_id": { "type": "string" },
      "reason": { "type": "string" }
    }
  }
}
```

At request construction, constrain `option_id` to the current option enum when
supported by the schema builder, force `choose_legal_action`, and set
`parallel_tool_calls: false`. The browser maps the chosen ID back to the locally
retained literal action and arguments, revalidates availability, and executes
through the normal action path. The model never invents argument objects.

### Model routing

- Designer hero flow: `gpt-5.6`, standard reasoning, medium effort by default;
- AI player: `gpt-5.6-luna` for lower latency/cost;
- model names remain environment-configurable but defaults are documented;
- no user-selectable arbitrary model picker in MVP.

### Streaming

Worker relays useful typed progress through SSE. UI does not display hidden
reasoning. Commit only after the strict tool arguments are complete.

## 20. AI context policy

MVP may send the full room source because the sample is small. Still implement
one context builder with hard limits so later optimization does not change the
AI boundary.

Priority order when trimming:

1. language/framework contract;
2. current runtime inspection and legal actions;
3. setup/rule definition cells;
4. recent action cells;
5. older chat cells last or omitted;
6. never omit a referenced definition silently—include a summary/index.

Do not persist OpenAI response state unless needed. Do not include capability
secrets or API keys.

## 21. Budget guard

A singleton Durable Object tracks daily AI usage counters:

- requests by endpoint/model;
- estimated input characters/tokens;
- failures and repairs;
- rooms exceeding per-hour limits.

It can disable further live AI while preserving deterministic product
functionality. Environment values define maximums. Log only aggregate usage.

## 22. Asset strategy

- primitive SVG/canvas art ships first;
- later generate a coherent static sprite set with GPT Image 2 or ChatGPT image
  generation;
- human reviews and checks generated assets into `public/assets`;
- record prompts, date, model, and files;
- loading errors fall back to primitives;
- no runtime image call is required for judging.

## 23. Deployment

- Cloudflare Worker serves static assets and API routes from one project;
- Cloudflare Vite plugin runs Worker code in `workerd` during development;
- SQLite Durable Object migrations live in Wrangler configuration;
- GitHub Actions runs validation, builds, then deploys on protected `main`;
- preview/version upload may be used before production promotion;
- production secrets live in Cloudflare/GitHub secret stores only;
- main URL and `/judge` route to the immutable demo entry.

## 24. Observability

Record structured, sampled, non-secret events:

- room join/reconnect;
- cell accepted/rejected/rebase;
- hash mismatch;
- interpreter error code;
- AI request latency, model, attempt count, outcome;
- fallback use;
- judge reset/fresh copy.

Do not log full capability tokens, authorization headers, API keys, or full
private prompts by default.

## 25. Technical risks

| Risk | Likelihood | Impact | Mitigation / gate |
|---|---:|---:|---|
| Interpreter scope expands toward all JavaScript | medium | high | Frozen subset and sample-driven additions only |
| Inverse patch misses a mutation | medium | critical | Central store, mutation union, rollback/hash property tests |
| Closures or allocators restore incorrectly | medium | high | Dedicated semantic and redo tests |
| Client divergence | medium | high | canonical hash, version pinning, two-runtime convergence tests |
| AI generates unsupported source | high | medium | exact prompt contract, diagnostics, three repairs, fallback |
| Multiplayer conflict breaks pending action | medium | medium | inverse stack, re-execute, reject/repair semantics |
| Geometry tolerance causes wrong zone activation | medium | medium | independent fixtures and visual debug overlays |
| Mobile canvas interaction is poor | medium | high | mobile E2E and touch gate before polish |
| OpenAI cost or rate limit | medium | high | per-room/global budgets, model routing, deterministic fallback |
| Cloudflare deploy/DO migration issue | medium | high | deployment in M2, Workers Vitest, preview then production |
| Static generated art inconsistent | medium | low | primitive fallback and late cuttable slice |
| Deadline pressure | high | critical | cut line after M6; no features outside kill list |

## 26. Architecture acceptance gates

Before sample expansion, prove:

- supported syntax and closures work;
- failed cell restores exact hash;
- forward/inverse patches round-trip;
- fuel stops an unsupported long computation;
- two runtimes replay to the same hash;
- pending rollback + authoritative cell + pending re-execute converges;
- renderer is not canonical state;
- server tests show ordering/idempotency/reconnect;
- common action latency is acceptable on target desktop/mobile hardware.
