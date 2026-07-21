# Submission copy draft

> **Human rewrite required.** Do not paste this document into Devpost as-is.
> Verify every claim against the tagged production build, then rewrite it in
> the author's own voice. Remove every placeholder and every feature that was
> cut.

## Project name candidates

1. **Board Game Computer** — recommended working title; direct and technical.
2. **RuleRoom** — emphasizes live shared rules.
3. **Living Table** — emphasizes the persistent changing tabletop.
4. **Playforge** — emphasizes creation through play.
5. **Replayable** — emphasizes reversibility, but is less tabletop-specific.

Before submission, check that the selected name does not create obvious
trademark/confusion risk. The repository may keep the Board Game Computer working name.

## Tagline candidates — all under 140 characters

### Recommended

> Describe a rule, watch the shared tabletop rewrite itself, and play the result
> with GPT-5.6.

### Alternatives

> A live reversible tabletop where people and GPT-5.6 create and play through
> the same code.

> Turn a board-game idea into a shared, inspectable game—and keep rewriting it
> while you play.

## Short description

Board Game Computer is a shared programmable tabletop. Every setup step, rule, move,
chat message, and AI-authored change becomes a cell in one live room program. A
custom reversible JavaScript-shaped interpreter makes cells atomic, supports
undo/redo and optimistic multiplayer rebase, and keeps GPT-5.6 behind the same
validated action and rule boundaries as human players.

## Track rationale — Apps for Your Life

Board Game Computer is a consumer creativity and play experience for tabletop
enthusiasts. It helps people turn a mechanic or house-rule idea into something
they can immediately play with friends or an AI seat, without first building a
custom application. The demonstrated outcome is personal creative
experimentation and entertainment, not an enterprise workflow or educational
measurement system.

## Suggested technology tags

Use only technologies actually present in the tagged repository:

- OpenAI
- GPT-5.6
- Codex
- Responses API
- TypeScript
- React
- Cloudflare Workers
- Durable Objects
- WebSockets
- Acorn
- PixiJS
- Vite
- Bun
- Playwright
- Vitest

## Full Devpost story draft

### Inspiration

I keep coming back to the same frustrating gap in tabletop design: an idea for
a rule can take seconds, but turning it into a playable prototype can take
hours or days. You need components, a rules implementation, state management,
players, and repeated setup after every change. Most AI tools stop at a rules
document or generate a one-off app. I wanted the table itself to remain alive
and programmable while people are playing.

### What it does

Board Game Computer opens on a complete original game called Shifting Vaults. The room
is not stored as a static configuration. It is an ordered program made of
cells: setup, object creation, rules, player actions, chat, and later rule
changes all use the same language.

A guided replay highlights a cell and shows the exact deterministic changes it
causes on the tabletop. The player can take control, move pieces or play cards,
and an AI seat chooses from the same registered legal actions.

The central demo asks GPT-5.6 to add a rule: whenever an explorer enters a blue
gate, rotate the linked room. GPT-5.6 writes a source cell. Board Game Computer parses
it, checks the allowed language, executes it speculatively, runs triggers and
invariants, and commits it only if the transaction succeeds. The next move
through the gate visibly rotates the room, and the game continues to a real
win or loss.

### How it works

The browser uses Acorn to parse a familiar JavaScript-shaped language, but it
does not use `eval`. I built a TypeScript AST interpreter with its own scopes,
slots, heap, functions, and closures. Every mutation goes through a transaction
journal that produces forward and inverse patches.

That reversible store is useful beyond undo. During optimistic multiplayer,
the client can undo only its short pending tail, apply a newly ordered server
cell, and re-execute the pending commands. It does not replay the full room
whenever two people move pieces at nearly the same time.

Cloudflare Durable Objects store and globally order cells, broadcast them over
WebSockets, and handle reconnects. They never execute the game simulation. The
clients execute the same ordered program and compare deterministic state
hashes.

PixiJS renders the table, while a separate TypeScript geometry kernel handles
lines, Bézier curves, arcs, path intersections, containment, room connections,
and z-ordered hit testing. The renderer is a projection, not the game state.

### How GPT-5.6 is used

The Cloudflare Worker calls the OpenAI Responses API. The Designer flow uses
`gpt-5.6` with a strict tool schema that returns candidate source and a concise
summary. The browser still parses and executes that source before it can join
the room. Structured diagnostics can be returned for up to three repair
attempts.

The AI player uses a lower-latency GPT-5.6 family model to choose one option
from a finite list of registered legal actions. It cannot submit an arbitrary
state patch. If the API fails, a deterministic policy keeps the game playable
and a clearly labelled example rule demonstrates the same interpreter without
pretending it was generated live.

### How Codex was used

Replace this section with concrete evidence from the primary Codex session.
Examples to document only if true:

- implemented and tested AST node semantics;
- generated the reversible mutation/patch test matrix;
- built Cloudflare Durable Object protocol and eviction tests;
- implemented Pixi projection and mobile interaction;
- diagnosed rebase and closure bugs;
- created Playwright judge-path coverage;
- kept `STATUS.md` and evidence current milestone by milestone.

Name where the human made the key product and architecture decisions: live
room-as-program model, custom interpreter, inverse patches, no server
simulation, cooperative security, complete sample game, and frozen kill list.

### Challenges

The hardest part was not parsing JavaScript syntax. It was making the
interpreter reversible without hiding mutable state in the host engine.
Bindings, closures, arrays, rules, random state, and ID allocators all needed to
pass through one transaction store so a failed or reordered command could be
undone exactly.

A second challenge was keeping the demo honest. GPT-5.6 output is not treated
as authority. The product had to remain understandable and playable before the
first AI call and survive timeouts, invalid source, or exhausted budget.

### Accomplishments

Keep only verified items:

- a complete original 10–15 minute game;
- a reversible JavaScript-shaped runtime;
- visible source-to-table replay;
- validated GPT-5.6 live rule authoring;
- legal-action AI play;
- optimistic pending-tail rebase;
- top-down vector tabletop on desktop and mobile;
- free no-login Cloudflare deployment and deterministic fallback.

### What I learned

The interesting boundary is not “AI generates code.” It is whether generated
logic enters the same inspectable, testable, reversible system that humans use.
Once the room is a program and every cell is a transaction, replay, AI tools,
direct manipulation, multiplayer, and forks become different views of the same
model rather than separate features.

### What's next

Future directions, not Build Week claims:

- more player roles and selective views;
- Game Master capabilities;
- block-based editing inspired by reversible text/block systems;
- reusable game packages;
- large-scale AI playtesting and balance analysis;
- richer generated visual themes;
- specialized transforms for collaborative rule editing.

## What was built — final checklist for copy

Delete any unchecked item before submission:

- [ ] complete Shifting Vaults game;
- [ ] reversible AST interpreter;
- [ ] forward/inverse patches and time travel;
- [ ] registered actions and BDD Scenarios;
- [ ] GPT-5.6 Designer generation and repair;
- [ ] GPT-5.6 AI player;
- [ ] custom vector geometry and Pixi renderer;
- [ ] Cloudflare Durable Object rooms;
- [ ] two-client optimistic rebase;
- [ ] mobile judge path;
- [ ] static AI-generated art with fallback;
- [ ] deterministic AI-disabled fallback.

## Key human decisions to mention

- Room program instead of separate config/state/rules products.
- Same language boundary for people and agents.
- JavaScript syntax with a custom reversible interpreter, not `eval`.
- Transaction patches as the basis for undo and multiplayer rebase.
- Server sequences source but never simulates.
- Registered actions for Player/AI authority.
- Custom geometry, top-down 2D, no physics.
- Complete original game rather than many shallow templates.
- Cooperative trust, no accounts or anti-cheat.
- Aggressive Build Week kill list.

## Testing instructions draft

1. Open `<production-url>/judge`; no account or key is needed.
2. Advance three replay cells and compare highlighted code, trace, and table.
3. Take control and make the highlighted move.
4. Run the AI turn.
5. Use the prepared blue-gate Designer prompt.
6. Enter the blue gate and confirm that the linked room rotates.
7. Use Reset/Fresh copy to repeat. If live AI is unavailable, use the clearly
   labelled example-rule fallback.

Full guide: repository `JUDGING.md`.

## Thumbnail and gallery shot list

### Thumbnail — preferred 3:2

- central colorful top-down vault table;
- blue gate and rotating linked room visibly emphasized;
- narrow but readable Script cell on left;
- small GPT-5.6 Chat confirmation on right;
- no tiny explanatory paragraph;
- optional short title: **“A tabletop that rewrites itself.”**

### Gallery

1. replay cell linked to table mutation;
2. complete tabletop with objective/threat/hand;
3. validated blue-gate Scenario source;
4. triggered room rotation and trace;
5. reversible patch/time-travel inspector;
6. two-client room if shipped;
7. mobile layout;
8. interpreter test/architecture diagram.

## Video script draft — target 2:10–2:25

### 0:00–0:12 — open on the product

“Board Game Computer is a live tabletop program. Every object, rule, and move is a cell
in the same shared room.”

Advance a replay cell and show source/trace/table together.

### 0:12–0:30 — take control

“This is a complete original game, not a generated picture. I can take control,
make a legal move, and the AI takes its own seat using the same action system.”

Show human action and AI action.

### 0:30–1:02 — GPT-5.6 hero moment

“I can also change the game while it is running. I asked GPT-5.6: whenever an
explorer enters a blue gate, rotate the linked room.”

Show progress, committed source cell, then enter gate and rotate linked room.

“The model does not patch state directly. Its source is parsed, checked,
executed as an atomic transaction, and committed only if the rules and
invariants pass.”

### 1:02–1:30 — technical implementation

“Underneath, Acorn parses JavaScript syntax and a custom TypeScript interpreter
owns scopes, closures, game objects, and deterministic random state. Every
cell produces forward and inverse patches.”

Show inspector/time travel.

“That also makes multiplayer rebase cheap: undo only pending local commands,
apply the server-ordered cell, and re-run the pending tail.”

Show brief two-client evidence only if shipped.

### 1:30–1:52 — infrastructure and fallback

“Cloudflare Durable Objects store and order cells, but the game runs on each
client. If OpenAI is unavailable, the complete game, deterministic AI, and a
labelled example rule still work.”

Show fallback/reset.

### 1:52–2:12 — Codex and human decisions

“Codex implemented the core runtime, tests, Cloudflare integration, and product
flow milestone by milestone. I made the core decisions: one live room program,
a reversible interpreter instead of eval, no server simulation, and one
complete game before extra features.”

Replace with verified concrete contributions and optionally show commit/test
montage.

### 2:12–2:22 — close

“Board Game Computer turns a tabletop idea into something inspectable, shareable, and
playable immediately—with GPT-5.6 sitting at the same table.”

End on rotating room and project name/URL.

## Final copy safety check

- [ ] Written in the author's own voice.
- [ ] Every present-tense feature is verified in evidence matrix.
- [ ] No mention of commercial game names or copied rules.
- [ ] No unsupported market-size or performance claim.
- [ ] No claim that the language is full JavaScript.
- [ ] No claim of adversarial security/private hands.
- [ ] Prior experiment is disclosed where appropriate.
- [ ] Video and text match tagged production exactly.
