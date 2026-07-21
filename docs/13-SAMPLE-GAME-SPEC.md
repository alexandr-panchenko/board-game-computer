# Shifting Vaults — complete sample game specification

Game spec version: `shifting-vaults-v1`

`Shifting Vaults` is an original short adventure race designed to prove that
Board Game Computer can run a complete tabletop game while exposing modular rooms,
vector zones, rotation, connections, cards, deterministic randomness,
registered actions, triggers, an AI seat, and a live rule change.

## 1. Player promise

Explore a reconfiguring vault, recover two relics, and return to the Gatehouse
before the threat track reaches collapse. In two-player mode, the first
explorer to escape with two relics wins; the vault can defeat everyone.

Target play time: **10–15 minutes**.

## 2. Supported modes

### Two-seat mode — primary demo

- Seat 1: human Designer/Player, explorer **Mara**.
- Seat 2: GPT-5.6 AI player, explorer **Ivo**.
- First explorer to return to the Gatehouse carrying two relics wins.
- If Threat reaches 10 first, the vault wins and both explorers lose.

A second human may occupy Ivo's seat through the Player share link in the
multiplayer slice.

### Solo mode

- One human controls Mara.
- Recover two relics and return before Threat 10.
- At the end of each round, Threat still increases.
- AI seat is omitted or disabled.

The Build Week judge path uses two-seat human + AI mode.

## 3. Components

### Board

A fixed 3×3 placement grid containing seven modular room tiles and two empty
spaces. Each room has a top-down polygon/path, four edge positions, a rotation
in 90-degree increments, tags, and a set of door edges in local orientation.

Required room IDs and themes:

1. `gatehouse` — starting room, cannot rotate.
2. `glass-gallery` — ordinary room.
3. `azure-gate` — blue-gate-tagged room, linked to `mirror-gallery`.
4. `mirror-gallery` — ordinary linked room.
5. `echo-hall` — ordinary room.
6. `reliquary` — ordinary room.
7. `clockwork-archive` — ordinary room.

Recommended grid positions:

```text
[ glass-gallery ] [ azure-gate      ] [ mirror-gallery ]
[ echo-hall     ] [ clockwork-archive] [ reliquary      ]
[ empty         ] [ gatehouse       ] [ empty           ]
```

The exact door patterns and initial rotations must make the seeded demo path
legal while still requiring at least one rotation during a normal game.

### Explorers

- `explorer-mara`, owner `human`;
- `explorer-ivo`, owner `ai`;
- each starts at `gatehouse`;
- each stores current zone, relic count, action points, hand IDs, and one-card-
  per-turn flag;
- explorer pieces are draggable only when a legal Move action exists.

### Exploration tokens

Six face-down tokens are assigned one per non-Gatehouse room:

- four `relic` tokens;
- two `hazard` tokens.

Assignment and order use the seeded room PRNG. Information is open after a
token is surveyed or searched; adversarial secrecy is not required.

### Threat counter

- starts at 2 in a fresh game;
- maximum 10;
- increases by 1 after each complete round;
- increases by 1 when a hazard is searched;
- may be reduced or prevented by a tactic card;
- reaching 10 ends the game immediately with `vault-collapse` loss unless a
  winning return action already completed earlier in the same transaction.

### Tactic deck

Eight cards, two copies of each:

1. **Sprint** — take one legal Move without spending an action point.
2. **Gear** — rotate one adjacent unoccupied room clockwise without spending an
   action point.
3. **Survey** — reveal the exploration token in the current or orthogonally
   adjacent room without resolving or collecting it.
4. **Ward** — reduce Threat by 1, minimum 0.

Rules:

- shuffle with seeded PRNG during setup;
- each explorer draws two cards during setup;
- at turn start, draw until hand size is three or deck is empty;
- play at most one tactic card per turn;
- discard after resolution;
- when draw pile is empty, shuffle discard into a new draw pile;
- hands are visually separate but not security-private in MVP.

## 4. Connections

Two orthogonally adjacent rooms are connected when both have a door on their
shared edge after rotation.

- room placement does not move during the base game;
- rotation changes local door orientation and therefore legal movement;
- `gatehouse` cannot rotate;
- a room occupied by any explorer cannot be rotated by the standard Rotate or
  Gear action;
- the live blue-gate rule may rotate its linked room only if the linked room is
  unoccupied; if occupied, the Scenario records a skipped effect rather than
  failing the player move.

The geometry layer renders door/path markers and validates zone drop. The
framework's topology helper is the authority for room-to-room movement.

## 5. Setup

1. Create players, rooms, counters, tokens, deck, discard, and explorer pieces.
2. Place rooms at the specified grid coordinates.
3. Apply seeded initial rotations from the template fixture.
4. Shuffle exploration token assignment with the seeded PRNG.
5. Shuffle the tactic deck.
6. Place Mara and Ivo in Gatehouse.
7. Set both relic counts to 0.
8. Set Threat to 2, round to 1, active seat to human.
9. Draw two tactic cards for each explorer.
10. Register all actions, scenarios, and invariants.
11. Start Mara's turn, refill hand to 3, and set action points to 2.

The immutable judge template may contain additional historical cells that
advance to a curated midgame checkpoint. A fresh game still starts from the
rules above.

## 6. Turn sequence

### Start turn

- set active explorer action points to 2;
- reset `tacticPlayedThisTurn` to false;
- draw until hand size is 3;
- emit `turn-started`.

### Action phase

The active explorer may perform legal actions in any order while action points
remain, and may play at most one tactic card.

### End turn

The player may end early or ends automatically when no useful legal action
remains and action points are 0.

- emit `turn-ended`;
- switch active seat;
- after Ivo's turn in two-seat mode, increment round and Threat by 1;
- check collapse;
- start next explorer's turn unless game ended.

## 7. Registered actions

### `move-explorer`

Cost: 1 action point.

Legal when:

- actor is active;
- chosen explorer belongs to actor;
- destination is orthogonally adjacent;
- matching doors connect current room and destination;
- game is not over.

Effects:

- spend 1 action point;
- move explorer to destination;
- emit `entity-left-zone` and `entity-entered-zone`;
- check immediate win condition after all entry Scenarios resolve.

### `rotate-adjacent-room`

Cost: 1 action point.

Legal when:

- actor is active;
- target room is orthogonally adjacent to actor's current room;
- target is not Gatehouse;
- target contains no explorer;
- game is not over.

Effect: rotate target clockwise 90 degrees and emit `room-rotated`.

### `search-room`

Cost: 1 action point.

Legal when:

- actor is active;
- current room is not Gatehouse;
- room token has not been resolved;
- game is not over.

Effects:

- spend 1 action point;
- reveal token;
- if relic: increment actor relic count and attach token to player area;
- if hazard: increment Threat by 1;
- mark room searched;
- emit `room-searched` and `relic-collected` or `hazard-triggered`;
- check collapse and win conditions.

### `play-tactic-card`

Cost: 0 action points, maximum once per turn.

Common legality:

- actor is active;
- card is in actor hand;
- no tactic has been played this turn;
- required targets are legal;
- game is not over.

Card-specific effects are listed in Components. Move/Rotate effects reuse the
same underlying framework validation but bypass action-point spending.

### `end-turn`

Cost: none. Legal for active actor while game is active. Runs End turn sequence.

## 8. Scenarios and invariants

### Base Scenarios

- `Hazard raises threat` — already covered by Search effect or represented as a
  Scenario for demo trace; choose one source of mutation, not both.
- `Round pressure` — after Ivo ends a turn, increment round and Threat.
- `Collapse` — when Threat reaches 10, end game with vault victory.
- `Explorer escapes` — when an explorer enters Gatehouse with at least two
  relics, end game with that explorer as winner.
- `Refill tactic deck` — when draw pile is empty and discard non-empty, shuffle
  discard into draw.

### Live hero Scenario

Not present in the base game. GPT-5.6 adds:

> Whenever an explorer enters a blue gate, rotate the connected room
> clockwise.

Expected semantics:

- match `entity-entered-zone` after movement;
- require entity tag `explorer` and zone tag `blue-gate`;
- resolve `linkedRoomId`;
- if linked room contains no explorer, rotate it +90 degrees and emit
  `room-rotated` with cause `blue-gate-scenario`;
- if occupied, record `scenario-skipped` with reason `room-occupied`;
- then continue ordinary win/invariant checks.

### Required invariants

- Threat is an integer between 0 and 10.
- Exactly one active seat exists while game is active.
- Explorer action points are integers between 0 and 2 at ordinary turn state.
- Every explorer occupies exactly one existing room.
- Every token is in exactly one location: unresolved room, player relic area,
  or resolved hazard discard.
- A room rotation is one of 0, 90, 180, 270.
- Each card exists in exactly one pile or hand.
- Stable IDs are unique.
- A finished game has one immutable result.

## 9. End conditions

### Player victory

After all effects of a movement transaction, if an explorer is in Gatehouse
and carries at least two relics:

```text
result.type = "explorer-escaped"
result.winnerSeatId = actor seat
result.round = current round
```

The first such committed cell wins. Remaining pending actions become invalid.

### Vault victory

If Threat reaches 10 before a player victory is committed:

```text
result.type = "vault-collapse"
result.winnerSeatId = null
```

All ordinary actions become unavailable. Replay and fork remain available.

## 10. AI-player context and behavior

The client materializes legal actions and sends:

- active explorer position, relic count, action points, hand labels;
- room connection graph;
- searched/unsearched/revealed token state;
- Threat and round;
- exact legal action options with literal target IDs;
- objective and concise recent trace.

The model chooses only from those options.

### Deterministic fallback policy

In priority order:

1. if carrying two relics, choose a move on a shortest legal path toward
   Gatehouse;
2. search current room if unresolved;
3. play Sprint if it enables progress toward an unresolved/revealed relic or
   home;
4. play Gear or Rotate to open a useful connection;
5. move toward the nearest unresolved room or revealed relic;
6. play Survey on an unresolved current/adjacent room;
7. play Ward when Threat is at least 8;
8. end turn.

Tie-break using stable action ID and then target ID. Never call native random.

## 11. Curated judge checkpoint

The immutable demo template contains a deterministic history that reaches a
midgame state approximately like:

- Round 3, human turn beginning or mid-turn;
- Mara has 1 relic and is positioned to approach Azure Gate;
- Ivo has 0 or 1 relic and remains competitive;
- Threat is 4;
- at least one tactic card is visible in Mara's hand;
- Azure Gate's linked Mirror Gallery is unoccupied;
- the next few historical cells demonstrate move/card/trigger causality;
- after guided replay, Mara can legally move into Azure Gate once the hero rule
  is added.

Exact cell IDs, rotations, hands, and token assignment are test fixtures. Do
not rely on a live model to produce the checkpoint.

## 12. Guided replay fixture

Recommended three visible steps:

1. Mara plays **Gear** to rotate a nearby room and open a route.
2. Mara makes a legal Move toward Azure Gate; the trace updates topology and
   action points.
3. Ivo searches Echo Hall, reveals a hazard, and the existing threat logic
   increments Threat.

Then **Take control** places the user in a state where the prepared Designer
request and an immediate move into Azure Gate are legal and visually obvious.

## 13. Presentation

- room tiles have clear door marks and rotation animations;
- Azure Gate has unmistakable blue-gate visual language;
- linked room can pulse when the new Scenario is committed;
- relics, hazards, tactics, AP, round, and Threat are readable without opening
  Script;
- all commercial game inspirations remain unmentioned in shipped UI;
- primitive shapes are sufficient fallback; static generated art may replace
  them without changing hit geometry.

## 14. Completeness acceptance test

A test or scripted E2E path must prove:

- fresh setup is deterministic from seed;
- both seats can take complete turns;
- all action types can resolve;
- tactic deck reshuffles correctly;
- four relic/two hazard token conservation holds;
- Threat can cause loss;
- an explorer can collect two relics, return, and win;
- AI fallback can finish a legal turn;
- live blue-gate Scenario changes later movement outcomes without corrupting
  invariants;
- replay/undo/redo preserve the exact final hash.
