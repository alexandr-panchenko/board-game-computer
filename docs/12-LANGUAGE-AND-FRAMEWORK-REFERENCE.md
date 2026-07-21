# Board Game Computer language and framework reference

Language version: `board-game-computer-js-0.1`

This document defines the Build Week language contract. Implement only this
contract plus additions strictly required by the frozen sample. Do not drift
toward full ECMAScript.

## 1. Design goals

The language must be:

- immediately familiar to JavaScript users and GPT-5.6;
- expressive enough for many turn-based tabletop mechanics;
- finite and fuel-bounded;
- deterministic;
- isolated from DOM, network, timers, and native host state;
- reversible at cell boundaries;
- source-located and easy to repair after diagnostics;
- inspectable in ordinary highlighted code.

It is accurate to describe it as:

> A reversible JavaScript subset for live tabletop programming.

Do not claim that arbitrary JavaScript or every JavaScript library works.

## 2. Cell semantics

- A source submission is parsed as a script body.
- A cell executes synchronously inside one open transaction.
- Top-level bindings persist in the runtime global scope.
- A failed cell rolls back every mutation and creates no committed cell.
- Trigger effects and invariant checks belong to the same transaction.
- Functions and closures are interpreted values.
- Cells cannot schedule later native work.

## 3. Supported statements

Required for version 0.1:

- `VariableDeclaration` with `let` and `const`;
- `FunctionDeclaration`;
- `BlockStatement`;
- `ExpressionStatement`;
- `IfStatement`;
- `ForOfStatement` over finite runtime collections;
- `ReturnStatement`;
- `BreakStatement`;
- `ContinueStatement`;
- `EmptyStatement`;
- optional `SwitchStatement` only if the sample or generated-rule tests need it;
- optional `ThrowStatement` for explicit rule errors after core rollback works.

Not supported:

- `var` in version 0.1;
- classic `ForStatement`;
- `WhileStatement`;
- `DoWhileStatement`;
- `ForInStatement`;
- `TryStatement`;
- `WithStatement`;
- labelled statements;
- imports/exports;
- classes;
- async/generators;
- debugger statements.

Unsupported nodes fail before execution with a source-located diagnostic.

## 4. Supported expressions

Required:

- identifiers;
- numeric, string, boolean, null, and template literals;
- array literals;
- plain object literals with static or computed keys;
- unary `!`, `+`, `-`;
- binary arithmetic `+`, `-`, `*`, `/`, `%`;
- comparisons `<`, `<=`, `>`, `>=`, `===`, `!==`;
- logical `&&`, `||`, `??` with short-circuit semantics;
- conditional expression `condition ? a : b`;
- member access `object.key` and `object[key]`;
- assignment `=`, `+=`, `-=`, `*=`, `/=`, `%=`;
- update `++` and `--` if implemented transactionally;
- call expressions;
- function expressions;
- arrow functions;
- optional chaining only after ordinary member/call semantics are stable;
- spread in array/object literals only if required by the sample.

Not supported:

- `new`;
- `this`;
- `super`;
- `await` or `yield`;
- tagged templates;
- dynamic import;
- regex literals in version 0.1;
- BigInt, Symbol, Proxy, WeakMap, WeakSet;
- access to native prototypes or constructors.

## 5. Binding semantics

- `let` creates a mutable slot.
- `const` creates an immutable slot initialized once.
- access before initialization is an error.
- redeclaring a binding in the same scope is an error.
- lexical block scopes are supported.
- function declarations create immutable or replaceable bindings according to
  one documented runtime rule; prefer explicit framework replacement APIs for
  rules rather than relying on redeclaration.
- closures capture scope IDs, not value snapshots.
- all slots and scope allocations are transaction journal mutations.

Recommended runtime rule for top-level function changes:

- first declaration creates the binding;
- a later Designer cell may replace a top-level function declaration with the
  same name through a controlled `define-or-replace-function` mutation;
- local-scope duplicate declarations remain errors.

Document and test whichever exact rule is implemented.

## 6. Runtime objects and arrays

Interpreted records and arrays live in the custom heap.

Required record behavior:

- get/set/delete own property;
- enumerate stable own keys;
- no prototype chain;
- no getters/setters;
- no host object identity.

Required array behavior:

- numeric indexing and `length`;
- `push`, `pop`, `shift`, `unshift`, `slice`, `splice`;
- `includes`, `indexOf`;
- `find`, `findIndex`, `some`, `every`;
- `map`, `filter`, and `reduce` after callback semantics are stable;
- all mutating methods produce reversible mutations;
- callback methods consume fuel and enforce finite collection limits.

Strings expose only whitelisted pure methods needed by prompts/sample, such as
`includes`, `startsWith`, `endsWith`, `toLowerCase`, and `toUpperCase`.

No method is available merely because it exists on native JavaScript objects.
Every method is explicitly registered.

## 7. Operators and equality

- `===` and `!==` are the supported equality operators.
- Do not support coercive `==` or `!=` in version 0.1.
- Arithmetic follows JavaScript-like number behavior, but non-finite results
  (`NaN`, `Infinity`) are runtime errors before commit unless explicitly
  approved later.
- `+` concatenates when either operand is a string; otherwise it adds numbers.
- Truthiness may follow a documented JavaScript-like subset for null,
  undefined, booleans, zero, empty string, and objects.
- Object equality is stable runtime identity by object ID.

## 8. Control-flow bounds

### `for...of`

- iterable must be a runtime array or an engine-owned finite collection;
- collection size cannot exceed `RUNTIME_MAX_COLLECTION_SIZE`;
- iteration order is stable and documented;
- each iteration consumes fuel;
- mutation of the iterated collection follows one tested rule, preferably a
  snapshot of initial element IDs/values to avoid ambiguous live iterators.

### Functions

- every call consumes fuel;
- call depth cannot exceed `RUNTIME_MAX_CALL_DEPTH`;
- direct and statically visible mutual recursion is rejected;
- dynamic cycles are stopped by fuel/depth and rolled back;
- recursion is not a supported programming pattern.

## 9. Host capability model

Interpreted code can call only registered native functions. It has no implicit
access to:

- `window`, `document`, `globalThis`, `self`;
- `fetch`, WebSocket, EventSource, XMLHttpRequest;
- timers, animation frames, workers;
- storage, cookies, clipboard, navigation;
- `eval`, `Function`, constructors, prototypes;
- OpenAI or room server clients;
- PixiJS objects;
- arbitrary TypeScript objects.

Native functions receive runtime values, validate them, and either:

- return a pure runtime value; or
- mutate state only through the current `Transaction`.

## 10. Core utility functions

Planned pure helpers:

```js
min(...numbers)
max(...numbers)
abs(number)
floor(number)
ceil(number)
round(number)
clamp(number, minValue, maxValue)
range(start, endExclusive)
keys(record)
values(record)
hasTag(ref, tag)
count(collection)
assert(condition, message)
trace(label, details?)
```

Do not expose the native `Math` object unless implemented as a frozen runtime
namespace with an explicit allowlist.

## 11. Stable references

Framework constructors return records with stable branded IDs. Example visual
shape shown to source code:

```js
const entrance = Zone("entrance", {
  label: "Gatehouse",
  path: RectPath(0, 0, 240, 180),
  tags: ["room", "start"],
});

const mara = Entity("explorer-mara", {
  kind: "explorer",
  owner: "human",
  zone: entrance,
  tags: ["explorer"],
});
```

The interpreter stores refs as ordinary runtime records whose ID fields are
validated by host functions. Source cannot mutate protected identity fields.

## 12. Geometry API

Required constructors and relations:

```js
Point(x, y)
LineTo(x, y)
CubicTo(cx1, cy1, cx2, cy2, x, y)
ArcTo(rx, ry, rotation, largeArc, sweep, x, y)
Path(startPoint, segments, { closed: true })
RectPath(x, y, width, height, radius?)
CirclePath(cx, cy, radius)
transformPath(path, transform)
intersects(a, b)
anchorInside(entity, zone)
fullyInside(entity, zone)
overlapRatio(entity, zone)
nearestPoint(path, point)
```

Geometry functions are native deterministic TypeScript implementations.
Interpreted source does not implement curve intersection algorithms.

## 13. Tabletop primitives

The exact API may use a namespaced `table` object or global constructors, but
keep source concise and consistent.

Required concepts:

```js
Zone(id, definition)
Entity(id, definition)
Card(id, definition)
Deck(id, definition)
Counter(id, definition)
Player(id, definition)
Team(id, definition)
move(entity, destinationOrPosition)
rotate(entityOrZone, degrees)
flip(entity)
draw(deck, count, destination)
shuffle(deck)
reveal(entity)
setOwner(entity, player)
addTag(ref, tag)
removeTag(ref, tag)
emit(eventType, payload)
endTurn()
endGame(result)
```

Constructors and mutators must be idempotent only when explicitly documented.
Duplicate stable IDs should normally produce a diagnostic.

## 14. BDD-style rule framework

Version 0.1 uses JavaScript-native builders, not a separate Gherkin parser.

### Scenario

Canonical style:

```js
Scenario("Blue gate rotates its linked room", () => {
  Given(({ event }) =>
    event.type === "entity-entered-zone" &&
    hasTag(event.entity, "explorer") &&
    hasTag(event.zone, "blue-gate")
  );

  When("after");

  Then(({ event }) => {
    rotate(linkedRoom(event.zone), 90);
  });
});
```

Builder rules:

- `Scenario` opens a temporary registration context;
- exactly one `Given`, `When`, and `Then` are required in version 0.1;
- functions are stored as interpreted closures;
- registration is transactional and reversible;
- stable scenario ID is derived from explicit ID or normalized name;
- execution order is stable by registration sequence and scenario ID.

### Invariant

```js
Invariant("Prestige is non-negative", () => {
  return mara.prestige >= 0 && ivo.prestige >= 0;
});
```

Invariants run after trigger completion and before cell commit.

### Example/Test

Optional but strongly recommended for generated rules:

```js
Example("Buying a Ruby card adds its discount", () => {
  GivenState(() => give(mara, [ruby, sapphire]));
  WhenAction(() => performAction("buy-card", {
    actorId: "human",
    cardId: "crimson-relay"
  }));
  ThenExpect(() => mara.discounts.ruby === 1);
});
```

Examples run in isolated nested transactions and never mutate the live room.
If this is too large for M5, generated code validation may rely on speculative
execution plus invariants, but the framework names should remain reserved.

## 15. Registered actions

Canonical style:

```js
Action("move-explorer", {
  label: "Move",
  actorRole: "explorer",

  choices: ({ actor }) => ({
    entityId: ownedEntities(actor, "explorer"),
    destinationId: ({ entityId }) => connectedZones(zoneOf(entityId)),
  }),

  availableWhen: ({ actor, entityId, destinationId }) =>
    actionPoints(actor) >= 1 &&
    canEnter(entityId, destinationId),

  perform: ({ actor, entityId, destinationId }) => {
    spendActionPoints(actor, 1);
    move(entityId, destinationId);
  },

  ui: {
    gesture: "drag",
    highlight: "destinationId",
  },
});
```

Requirements:

- action ID is stable and unique;
- choice providers return finite runtime collections;
- materialization creates literal option IDs/labels safe for network/AI;
- availability is re-evaluated immediately before execution;
- action effect runs in the current cell transaction;
- human drag/buttons and AI calls use the same executor;
- a Player cell source is generated canonically:

```js
performAction("move-explorer", {
  actorId: "human",
  entityId: "explorer-mara",
  destinationId: "azure-gate",
});
```

## 16. Events and trace

Framework operations emit deterministic events. Example:

```text
performAction: move-explorer
  validate action
  spend action point
  move explorer-mara → azure-gate
  emit entity-left-zone
  emit entity-entered-zone
  match scenario: Blue gate rotates its linked room
  rotate mirror-gallery +90°
  check invariants
```

Trace is user-visible but not a source of truth. It references source locations,
entity IDs, scenario IDs, and mutation summaries.

## 17. Random API

```js
randomInt(minInclusive, maxExclusive)
randomChoice(collection)
shuffle(collectionOrDeck)
roll(sides)
drawRandom(bag)
```

All functions use the room PRNG. They are transaction-aware, fuel-costed, and
reversible. No native randomness is available.

## 18. Diagnostics

Diagnostics must contain:

```ts
interface RuntimeDiagnostic {
  code: string;
  phase: "parse" | "validate" | "execute" | "trigger" | "invariant" | "conflict";
  message: string;
  cellId?: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  hints?: string[];
  availableNames?: string[];
  trace?: TraceSummary;
}
```

Required stable error families:

- `TS_PARSE_*`;
- `TS_UNSUPPORTED_NODE`;
- `TS_UNKNOWN_IDENTIFIER`;
- `TS_DUPLICATE_BINDING`;
- `TS_CONST_ASSIGNMENT`;
- `TS_FORBIDDEN_PROPERTY`;
- `TS_CAPABILITY_DENIED`;
- `TS_ACTION_UNAVAILABLE`;
- `TS_INVALID_REFERENCE`;
- `TS_FUEL_EXHAUSTED`;
- `TS_CALL_DEPTH_EXCEEDED`;
- `TS_COLLECTION_LIMIT`;
- `TS_TRIGGER_LIMIT`;
- `TS_INVARIANT_FAILED`;
- `TS_STATE_HASH_MISMATCH`;
- `TS_REBASE_CONFLICT`.

Agent repair prompts receive diagnostics, allowed alternatives, and relevant
API signatures, not only a generic error string.

## 19. Example setup cell

Illustrative only; exact sample source may use helpers:

```js
const bank = Zone("central-bank", {
  label: "Crystal Bank",
  path: RectPath(180, 250, 700, 160),
  tags: ["bank", "physical"],
});

const market = Zone("market", {
  label: "Face-up Market",
  path: RectPath(260, 40, 820, 190),
  tags: ["market", "card-zone"],
});

const ruby = Entity("ruby-1", {
  kind: "crystal-token",
  owner: "human",
  zone: bank,
  tags: ["ruby", "ordinary-crystal"],
});
```

## 20. Language implementation order

1. literals, identifiers, let/const, scopes, blocks;
2. records, arrays, member access, assignment;
3. operators and short-circuit control;
4. functions, closures, return;
5. `if` and `for...of` with completion records;
6. native framework calls;
7. transactional mutation patches and rollback;
8. registered Actions and callback methods;
9. BDD Scenarios and Invariants;
10. sample-driven convenience methods only.

Do not implement unsupported syntax merely because Acorn can parse it.
