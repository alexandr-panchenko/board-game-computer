# Board Game Computer

**Describe a board game, change its rules, and playtest it immediately with AI.**

Board Game Computer is a virtual tabletop for board-game designers, hobbyists,
and groups who want to experiment with new mechanics or house rules without
building a game prototype by hand.

Instead of asking the AI to merely describe a game, you ask it to modify the
actual running game program. The table immediately applies the new rule, enforces
legal actions, and lets you continue playing against an AI opponent or another
person.

## Try it

- Live application: https://boardgamecomputer.com/
- Guided demo: https://boardgamecomputer.com/judge
- Source: https://github.com/alexandr-panchenko/board-game-computer

No login, payment, or user API key is required.

## What you can do

- Play a complete two-player tabletop game.
- Make only actions allowed by the current rules.
- Ask GPT-5.6 Luna to play as an opponent.
- Ask GPT-5.6 Designer to add or change a rule.
- See the new rule immediately affect the live game.
- Inspect the complete game program.
- Undo and redo actions and rule changes.
- Create a shared room and invite another player.
- Replay history or fork the game from an earlier point.

## Demo game: Prism Foundry

Prism Foundry is an original crystal-and-card engine-building game.

Each turn, a player either:

- takes two different crystals; or
- buys one affordable card.

Purchased cards provide permanent discounts and Prestige. Some cards grant
special abilities. The first player to reach 8 Prestige wins.

The guided demo shows three important capabilities:

1. The player makes a legal move.
2. GPT-5.6 Luna chooses a move for the opponent from the same legal-action system.
3. GPT-5.6 Designer adds a new rule to the running game, which immediately changes
   what happens on the table.

## How it works

Every game room is controlled by a program written in a restricted scripting
language with familiar JavaScript-like syntax.

The language runs inside a custom interpreter that:

- exposes only approved tabletop operations;
- rejects unsupported or unsafe constructions;
- limits execution;
- validates every generated command;
- records reversible state changes.

The AI can therefore create objects, define rules, modify the game, or act as a
player without receiving unrestricted access to the browser or server.

The server stores and orders room commands, while clients execute the same
deterministic program. This supports shared rooms, undo and redo, replay,
optimistic multiplayer updates, and forks from earlier game states.

## GPT-5.6 usage

Board Game Computer uses GPT-5.6 in two different roles.

### Designer

The Designer receives the current game program and a natural-language request.
It proposes a new source command or rule.

Before that rule becomes part of the game, the application:

1. parses it;
2. validates the language and permissions;
3. executes it speculatively;
4. checks that it can be reversed exactly;
5. commits it only after successful validation.

### Player

GPT-5.6 Luna receives a finite list of legal actions and selects one option. It
cannot invent arbitrary moves or directly edit game state.

A deterministic fallback keeps the full game playable when the OpenAI API is
unavailable.

## How Codex was used

The project was developed through one primary Codex session using a detailed
product and architecture packet.

Codex autonomously implemented milestone by milestone:

- the scripting-language interpreter;
- reversible state patches;
- the visual tabletop;
- the complete demo game;
- GPT-5.6 integration;
- shared Cloudflare rooms;
- tests, deployment, and production verification.

Codex worked especially well for building and validating large coherent
technical slices. It produced extensive automated coverage and repeatedly
verified the live deployment.

The main limitation was product judgment. Early versions were technically
complete but confusing and visually unconvincing. Human review rejected those
versions and redirected the agent toward a clearer game, a real room program,
and a more understandable tabletop experience.

This iterative combination—human product decisions and autonomous Codex
implementation—was central to the final result.

## Technology

- TypeScript
- React
- PixiJS
- Acorn
- Custom reversible AST interpreter
- OpenAI Responses API
- GPT-5.6 and GPT-5.6 Luna
- Cloudflare Workers
- Durable Objects
- Bun
- Vitest
- Playwright

## Local development

```bash
bun install --frozen-lockfile
bun run dev
```
