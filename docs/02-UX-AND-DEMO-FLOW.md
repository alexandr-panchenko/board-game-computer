# UX and demo flow — Prism Foundry

Status: binding final hero presentation; **AWAITING OWNER PRODUCT APPROVAL**.

## Audience and copy hierarchy

The primary user is a tabletop-game enthusiast or designer who wants to play, invent a rule, ask the table to add it, and keep playing. The default interface uses game instructions, user actions, short product explanations, and role-labelled agent conversation. Architecture terminology stays in Program, Advanced, README, and technical documentation.

The compact product header reads:

- `BOARD GAME COMPUTER`
- `Play the game. Rewrite the rules.`
- `Collect crystals, build your engine, and ask the table to add a new rule while you play.`
- secondary badge: `Powered by a live, reversible program`

The table itself always states:

- `Prism Foundry`
- `Be the first player to reach 8 Prestige.`
- `On your turn: take two different crystals or buy one card.`

## Permanent table workspace

The physical tabletop is the permanent base surface. At 1440 × 900, the complete table and primary action fit without document scrolling. It contains the six-card market, finite token bank, deck, Mara and Ivo mats, purchased-card tableaus, discounts, Prestige, turn marker, Rulebook, and House Rules.

The table teaches play contextually:

- bank: `Take 2 different colors`;
- market: `Buy 1 affordable card`;
- player tableau: cards permanently discount their color;
- turn marker and active-mat treatment identify the current player;
- House Rules shows the active rule;
- Rulebook opens the five compact rules.

The previous six-cell How to Play grid is absent.

## Direct interaction

### Take crystals

The player selects one ordinary crystal stack, sees its selected state, selects a second different stack, then confirms the in-table action such as **Take Ruby + Sapphire**. Recommended stacks are highlighted during the hero path. Both physical tokens animate from the bank to Mara's mat.

### Buy cards

Affordable cards glow and expose a Buy affordance. Selecting any card opens an attached contextual panel with its name, printed cost, owned crystals, discounts, final payment, Prestige, ability, and one primary **Buy** button. Unaffordable cards remain inspectable and clearly disabled.

Semantic HTML controls mirror these actions for keyboard users and automation without becoming a competing row of primary buttons.

### Ivo's turn

The physical marker moves to Ivo, Ivo's mat enters a thinking state, and the UI says **Ivo is choosing a move…**. After a short delay, Luna chooses one offered legal move automatically. The result and short reason appear under **Ivo · Player** in Table Agent. If the request fails, deterministic fallback acts truthfully; a visible **Play Ivo's turn** recovery remains available if automatic execution cannot finish.

## `/judge` hero track

Judge mode presents one compact indicator—`Demo · n of 4`—and one dominant next action. It never requires Program before the game is understandable.

1. **Take two crystals** — select highlighted Ruby and Sapphire, confirm, and watch them move.
2. **Ivo plays** — the active marker and thinking treatment move to Ivo; Luna or labelled fallback acts automatically.
3. **Change a rule** — Table Agent opens beside the table and submits the prepared Ruby Resonance request.
4. **Trigger the rule** — House Rules updates, Crimson Relay becomes the highlighted affordable card, and its purchase visibly fires the rule.

After the purchase, an appended-cell confirmation offers **View source**. Program opens at the exact cell. The complete hero story should take 60–75 seconds.

## Ordinary `/` and `/room` play

The ordinary route has no forced judging prose or competition-proof sequence. A small **Guided demo** action can start the coach. The user plays directly on the table, asks Table Agent for changes, inspects Program, or shares naturally.

Before persistence, the header says **Local game** and offers **Create shared room**. It explains that a shared room is needed to invite another player. After creation:

- the route becomes `/room/<roomId>`;
- Share opens automatically;
- the header shows short Room ID, connection, and current role;
- Share offers **Copy player invite**, **Open player view**, and **Copy room reference**;
- it says to send the Player invite link, not the bare room URL;
- no raw capability token is displayed.

Player role can play but cannot use Designer authority.

## Table Agent drawer

Table Agent occupies no more than about 35% of desktop width and preserves the table beside it. On mobile it becomes a closeable full-height drawer over the table base.

One chronological conversation contains:

- Ivo's move and reason under `Ivo · Player`;
- the user's request under `You · Rule request`;
- Designer progress and committed rule under `Designer · Rules`;
- truthful failure and fallback messages.

The composer explicitly selects **Change a rule** and retains the prepared request:

> When a player buys a Ruby card, give them one available Prism token.

Progress reads **Writing the rule…**, **Checking it…**, and **Adding it to the game…**. Acorn, AST, speculation, rollback, hashes, and capabilities appear only in collapsed **How this was validated** evidence.

## Program drawer

Program is a compact source environment, not a second website or a marketing page.

- Heading: `Live room program`.
- Supporting text: `Everything on the table was created by the source below.`
- One scrollable, syntax-highlighted chronological source surface.
- Narrow gutter, subtle cell numbers and separators, small author/role indicators, selected-cell highlight, and empty next-cell caret.
- No grouping by Setup, Rules, or Play.
- Comments, keywords, declarations, strings, numbers, calls, properties, punctuation, and diagnostics have distinct token styles.
- Trace, mutation summary, inverse availability, hashes, author, role, and timestamp appear only in the selected-cell inspector, collapsed by default.
- Undo, redo, and fork remain available after normal play and victory.

Whenever an action commits, a brief **Cell N added** confirmation offers **View source** and opens the exact cell. Desktop keeps the table beside the drawer; mobile provides an immediate close action back to the table.

## Rulebook

The physical Rulebook card opens a compact drawer containing exactly:

1. `Reach 8 Prestige first.`
2. `Take two different crystals OR buy one card.`
3. `Purchased cards give permanent discounts.`
4. `Prism tokens can pay for any color.`
5. `Some cards and House Rules change what happens after a purchase.`

## Mobile behavior

Mobile is not a vertically stacked desktop page. The table remains the base surface. Compact fixed controls reach Table Agent, Program, Rulebook, and Share. Drawers have visible close/back actions, source scrolls inside its own surface, table gestures do not fight page scrolling, and important touch targets are at least 44 px.

## Responsive and manual acceptance

Capture and inspect:

- 1440 × 900;
- 1280 × 800;
- Pixel 7;
- table with no rule;
- table after Ruby Resonance;
- Table Agent open;
- Program beside the table;
- Share with a short Room ID;
- second-browser Player view.

At 1440 × 900 a new viewer gets five seconds to answer: what game this is, its objective, which mat is theirs, whose turn it is, what they can do now, where to request a rule, where to inspect Program, and how to invite another player. Failure blocks release even if automation is green.

## Accessibility and honesty

- Keyboard focus has a visible 3 px outline.
- Interactive targets are at least 40 px desktop and 44 px mobile.
- Live announcements describe committed actions.
- Canvas has a meaningful label and semantic controls share the same legal-action path.
- Color is reinforced by names, text, geometry, and mat labels.
- Internal IDs do not appear in primary action copy.
- Model fallback is labelled and never represented as a live response.
