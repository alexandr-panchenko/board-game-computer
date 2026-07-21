# Prism Foundry — complete sample game specification

Game spec version: `prism-foundry-v1`

Prism Foundry is an original, compact two-player crystal-and-card engine builder. It is the sole production sample for Board Game Computer. Its content, setup, rules, and play history are executable room source cells—not a hidden TypeScript game snapshot.

## Objective and players

The first player to reach at least 8 Prestige after completing a purchase and its effects wins.

- Human seat: Mara.
- AI seat: Ivo, chosen by GPT-5.6 Luna from registered legal options; deterministic fallback uses the same option list.
- A shared-room player may later occupy Ivo's seat, but this is not the primary judging path.

## Physical tabletop

The interpreted room creates and the renderer projects:

- one felt table;
- a finite central bank with 5 Ruby, 5 Sapphire, 5 Emerald, 5 Amber, and 3 Prism tokens;
- one seeded 18-card deck and six-card face-up market;
- spent/deck areas;
- Mara and Ivo player mats;
- owned crystal tokens, purchased-card tableaus, four permanent discount markers, and Prestige on each mat;
- a physical turn marker;
- a Rulebook card;
- a House Rules card.

No game-specific value exists only in React. HTML legal controls are an accessibility mirror of registered runtime options.

## Turn

The active player performs exactly one ordinary action:

1. Take two different available ordinary crystals; or
2. Buy one affordable face-up market card.

The turn then passes unless Echo grants another turn. There are no action points, map movement, reserve, card tiers, threat track, or extra phases.

## Taking crystals

The action is legal only when both selected colors differ and at least one physical token of each color remains in the bank. Execution changes those token objects' container from `central-bank` to the active player's mat. Prism cannot be taken by the ordinary Take action.

## Cards and buying

Every original card has:

- stable ID and human-readable name;
- Ruby, Sapphire, Emerald, or Amber discount color;
- cost by ordinary color;
- 1–3 Prestige;
- no ability, Prism, or Echo;
- short ability text and procedural vector-art metadata.

Buying executes atomically:

1. Reduce each colored requirement by the buyer's permanent discount, never below zero.
2. Pay with owned matching tokens.
3. Pay any remaining colored requirements with owned Prism wild tokens.
4. Return all payment tokens to the bank.
5. Move the market card to the buyer's tableau.
6. Increment the matching permanent discount.
7. Add Prestige.
8. Resolve the printed ability.
9. Apply compatible House Rules.
10. Refill the market from the seeded deck.
11. Check victory.
12. Pass the turn unless Echo applies.

Any failed assertion rolls the whole cell back to its exact prior hash.

## Abilities

- **Prism** — after purchase, move one available Prism token from the bank to the buyer's mat.
- **Echo** — after purchase, retain the turn for one more ordinary action.
- Cards without a printed ability only provide Prestige and a permanent discount.

## Victory

After purchase effects, `checkVictory` ends the game when the buyer has at least 8 Prestige. The tabletop announces the winner. `legalOptions` becomes empty, while Program, undo, redo, replay inspection, and fork remain available.

The deterministic full-game test reaches Mara's 9-Prestige victory after 20 registered ordinary actions. No live model request is required.

## Genesis program

A fresh room executes one chronological 16-cell program:

1. Create the physical table.
2. Create the central crystal bank.
3. Create Mara and Ivo player mats.
4. Create Prestige, discount, turn, Rulebook, and House Rules markers.
5. Create all 23 physical crystal tokens.
6. Create the original 18-card catalog and seeded deck.
7. Create the market and deal six cards.
8. Register Take Crystals and Buy Card.
9. Define finite crystal transfers.
10. Define payment and permanent discounts.
11. Define Prism, Echo, and House Rules.
12. Define deterministic market refill.
13. Define turn progression.
14. Define the 8-Prestige ending.
15. Define buying, legal-option materialization, and shared action execution.
16. Execute setup and begin Mara's first turn.

These are normal Acorn-parsed, validator-checked cells executed by `RoomRuntime`. Their source, trace, forward patch, inverse patch, and state hashes appear in Program. Player and Designer cells append to the same uninterrupted sequence.

## Judging path

The deterministic checkpoint is the full 16-cell genesis prefix.

1. Inspect the complete Program.
2. Mara takes Ruby + Sapphire.
3. Ivo takes a legal pair selected by Luna or deterministic fallback.
4. GPT-5.6 Designer proposes, or the labelled offline path supplies:

```js
addHouseRule("Ruby resonance", {
  when: "buy-ruby",
  then: "gain-prism"
});
```

5. Local parsing, capability validation, speculative execution, and exact inverse rollback must pass before commit.
6. Mara buys Crimson Relay. The card moves, payment returns, Prestige and Ruby discount increase, the market refills, and Ruby resonance moves one Prism to Mara.
7. Continue to a real 8-Prestige ending or inspect/undo/replay/fork any committed cell.

## Determinism and invariants

- Card order and refill are seeded and deterministic.
- Every crystal token has exactly one container.
- Bank plus player holdings conserve 5/5/5/5/3 tokens.
- Market contains at most six distinct catalog cards.
- Discounts never become negative and never reduce payment below zero.
- A card has exactly one location and at most one owner.
- Only the active player can execute an ordinary action.
- No ordinary action is legal after victory.
- Identical ordered cells converge to the same hash.
- Undo and optimistic rollback apply inverse patches; ordinary multiplayer does not replay the whole room.

## Original assets

All visible card symbols, crystal geometry, table layout, rules wording, names, and colors are repository-authored procedural vector/CSS/Pixi work. No external runtime images, commercial game names, or unlicensed assets are used.
