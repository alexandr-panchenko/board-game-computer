# Product brief — Board Game Computer

## Frozen summary

**Board Game Computer is a live shared tabletop where people and GPT-5.6 create, play,
and change a board game through the same safe, reversible programming
language.**

A room is not a static rules file plus a separate state database. It is an
ordered sequence of cells. The setup, objects, rules, actions, messages, and
later rule changes are all expressed as cells in one living program.

The browser runs that program in a custom reversible interpreter. A user can
watch the room being built, play directly on the table, ask an agent to change
a rule, travel backward and forward through the command history, and share the
room with another browser client.

## Primary audience

Hobbyist tabletop creators and game-playing groups who have ideas for mechanics
or house rules but do not want to build a bespoke digital prototype before
they can test them.

Secondary audiences:

- independent tabletop designers;
- friends experimenting with original games or house rules;
- facilitators who want a programmable shared table;
- technically curious players who want to inspect the live program.

Professional studios are not the primary audience in the Build Week version.
The product does not yet include professional asset pipelines, analytics,
publication workflows, adversarial secrecy, or a production game marketplace.

## Problem

The path from an idea to a useful playtest is slow:

- rules must be formalized;
- a board, cards, tokens, and zones must be assembled;
- someone must enforce legal actions and triggers;
- every rules change requires rebuilding and explaining the prototype;
- extra players may be unavailable;
- digital prototyping normally requires programming and infrastructure work.

Text-only game-generation tools do not close that gap. They may produce a rule
book or code fragment, but they do not provide a persistent shared tabletop
where the same deterministic system can be inspected, played, modified, and
replayed.

## Desired outcome

A user should be able to:

1. open a functioning original game immediately;
2. understand that visible cells deterministically drive the table;
3. take control and perform a legal action;
4. play against GPT-5.6 acting through the same legal-action interface;
5. describe a rule change in ordinary language;
6. see a validated new source cell join the room program;
7. trigger the new rule on the live table;
8. continue to a real ending;
9. replay or fork the room.

The emotional target is:

> “I described a mechanic, and seconds later I was playing the modified game
> with an AI at the same table.”

## Product loop

```text
observe the live program
→ play a legal action
→ inspect the deterministic result
→ ask GPT-5.6 or write a command
→ validate and commit a new cell
→ keep playing under the new rule
→ replay, fork, or share
```

Creation, play, and modification are not separate applications. They are
moments in one room lifecycle.

## One-sentence value proposition

> Describe, play, and rewrite a board game in one shared room—people and
> GPT-5.6 operate the same safe, reversible tabletop language.

## Product roles

### Designer

- can submit general source within the allowed language;
- can create and change objects, rules, actions, triggers, and presentation;
- sees the complete Script/REPL view;
- can ask the Designer agent to author a new cell.

### Player

- uses registered actions exposed as buttons, highlighted zones, cards, and
  drag/drop affordances;
- can see the room log in the cooperative Build Week model;
- cannot submit arbitrary Designer source through the normal UI or server
  capability;
- may have a role/seat-specific action set.

### AI player

- receives a structured list of currently legal registered actions;
- chooses one action and arguments;
- never receives a tool that can mutate arbitrary state;
- uses the same `performAction(...)` path as a human player.

### Game Master

A separate GM authority level is part of the long-term vision but is explicitly
out of scope for Build Week.

## Core product concepts

### Room

A persistent shared environment addressed by a capability URL. The room owns an
ordered log of cells. Cloudflare assigns the global order; clients execute the
program.

### Cell

One atomic submission. A cell can be code, a registered action invocation,
chat, or a system/template cell. A successful executable cell produces a
forward patch, an inverse patch, an execution trace, and a resulting state
hash.

### Runtime

The client-side interpreted environment containing scopes, bindings, functions,
closures, heap objects, game registries, RNG state, and current materialized
game state.

### Registered action

A rule-defined finite interaction that can be evaluated for availability and
presented to humans and agents. Direct manipulation compiles to an action call.

### Scenario / invariant

Readable BDD-style framework primitives for triggers, legal conditions,
expected outcomes, and automated game tests.

### Replay and fork

The client can apply inverse/forward patches to inspect history. Continuing and
persisting from a past point creates a new room from that prefix.

## Mandatory end-to-end scenario

The Build Week product is not complete until this entire path works:

```text
open a polished in-progress sample
→ advance guided replay cells
→ take control
→ perform a legal action
→ receive a legal AI-player action
→ ask GPT-5.6 to add the blue-gate rotation rule
→ parse, validate, execute, and commit the generated cell
→ trigger the rule visibly
→ continue playing to a win or loss
→ reset or create a fresh copy
```

## Hero moment

The first screen shows `Shifting Vaults` already in progress. The user advances
a replay step and watches a highlighted source cell move a piece, reveal a
room, and fire a traceable trigger. After taking control, the user asks:

> “Whenever an explorer enters a blue gate, rotate the connected room
> clockwise.”

GPT-5.6 writes a new BDD-style cell. The interpreter validates and commits it.
The next move through a blue gate rotates the connected room on the canvas and
shows the trigger in the execution trace.

This demonstrates, in one sequence:

- a real deterministic game engine;
- a visible programming model;
- direct human interaction;
- AI participation as a player;
- AI-authored executable logic;
- validation and reversibility;
- continued play rather than a one-off generation.

## Sample game requirement

`Shifting Vaults` must be a complete original 10–15 minute game, not merely a
scripted scene. It must have:

- a setup;
- player turns;
- legal action discovery;
- deterministic seeded randomness;
- modular rooms with rotation and connections;
- explorers, relics, tactic cards, and a threat track;
- human and AI seats;
- clear solo/competitive ending rules;
- a winner or explicit loss;
- replayable source cells;
- at least one meaningful live rule modification that does not break the game.

Exact rules are frozen in `docs/13-SAMPLE-GAME-SPEC.md`.

## Scope freeze

### Must

- React/TypeScript application deployed to Cloudflare Workers;
- custom reversible Acorn AST interpreter;
- transactional state, forward/inverse patches, deterministic hash;
- top-down 2D tabletop and vector geometry;
- complete Shifting Vaults game;
- guided replay, takeover, Script/REPL, Chat, trace, and timeline;
- GPT-5.6 Designer integration with repair loop;
- one GPT-5.6 AI player using legal actions;
- deterministic fallback;
- persistent room URL and reset/fresh copy;
- responsive desktop and mobile judge path;
- tests, CI, documentation, evidence, and release tag.

### Supporting features — maximum three

1. shared room with two connected browser clients, reconnect, and optimistic
   rollback/reapply;
2. replay timeline and persistent `Fork from here`;
3. static AI-generated art with primitive fallback.

### Explicitly out of scope

- accounts, authentication profiles, saved-game library, marketplace, payments;
- adversarial privacy, anti-cheat, casino/wager-grade secrecy;
- GM role;
- arbitrary commercial game import, copied rules, or commercial assets;
- PDF/rulebook ingestion;
- block editor or Droplet port;
- a second language or separate free-form Gherkin parser;
- arbitrary ECMAScript, native `eval`, `Function`, WebAssembly, or host access;
- generalized CRDT/OT for editing old source;
- presence cursors, locking, voice, in-app audio, or video chat;
- 3D, isometric rendering, or physics;
- runtime image generation;
- advanced multi-agent balance simulation;
- a second sample game or full reusable deck-building product.

## Deterministic fallback

If the OpenAI API is unavailable:

- guided replay still works;
- the complete game remains playable;
- human REPL and registered actions remain available;
- the AI player uses a deterministic legal-action heuristic;
- the UI offers **Use labelled example rule**, which inserts a prewritten cell
  through the same parser/interpreter;
- the fallback is explicitly labelled and never misrepresented as a live model
  response.

## Success metrics for Build Week

The submission succeeds when:

- a first-time judge understands the core concept in the first 15 seconds;
- the complete 60–90 second path works repeatedly in production;
- the sample can be finished without manual state repair;
- generated code never bypasses validation;
- interpreter rollback/rebase tests prove the technical novelty;
- desktop and mobile paths work without registration or BYOK;
- all claims have direct evidence;
- the project remains available through judging.

## Long-term vision, not Build Week scope

- many player roles and teams with selective views;
- formal private information;
- a Game Master authority tier;
- richer visual and block-based authoring;
- reusable game packages and room templates;
- mass AI playtesting and balance analysis;
- more topology helpers and game genres;
- runtime-generated art and animation;
- semantic transforms for collaborative Designer editing.
