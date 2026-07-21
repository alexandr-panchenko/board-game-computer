# Board Game Computer — frozen product brief

Status: replacement product implemented; **AWAITING OWNER PRODUCT APPROVAL**.

## Product statement

**The board game is the program.**

Board Game Computer is a live shared tabletop where people and GPT-5.6 create, play, and change a complete game through the same reversible JavaScript-shaped room program.

## Product proof

The production sample is Prism Foundry. A fresh room starts empty and executes real chronological source cells that create its table, physical zones, finite tokens, player mats, original cards, market, actions, payment, abilities, turns, victory, setup, and first turn. Player actions and Designer rules append to that same sequence. The renderer projects interpreted runtime entities; React does not own a hidden second game model.

This visible continuity is the core proof:

```text
genesis source → interpreted entities/rules → physical tabletop
                                        ↓
human/Luna action source → atomic patches → same tabletop
                                        ↓
Designer source → validate/speculate/reverse/commit → same game
```

## Audience and five-second promise

Primary audience: hackathon judges, technical creators, tabletop designers, and developers curious about safe AI-authored interactive systems.

Within five seconds a viewer must be able to answer:

1. This is a board game created by its program.
2. Prism Foundry's goal is first to 8 Prestige.
3. Mara is the human seat and the gold control is the next action.
4. Change rules is a first-level product surface.
5. Program contains the complete executable game and history.

## Primary experience

1. Inspect the actual genesis program.
2. Take control of Mara through a registered legal option.
3. Let GPT-5.6 Luna choose for Ivo from legal options only.
4. Ask GPT-5.6 Designer to add Ruby resonance.
5. Watch local parse, validation, speculation, exact rollback, and commit.
6. Buy a Ruby card and watch the new rule move a physical Prism token.
7. Continue to a real 8-Prestige ending.
8. Undo, redo, replay-inspect, share, reconnect, rebase, and fork through patches and ordered cells.

## Required product surfaces

- **Table** — the dominant physical product: bank, market, deck, mats, tokens, cards, markers, Rulebook, House Rules, victory.
- **Program** — exactly one uninterrupted chronological notebook/REPL sequence with all genesis, action, and Designer cells; source is not curated away.
- **Change rules** — Designer request, safety process, live action, and labelled deterministic fallback.
- **Advanced diagnostics** — hashes, room details, and developer evidence collapsed by default.

## Technical invariants

- Acorn AST plus custom TypeScript interpreter; never native evaluation.
- Deliberate JavaScript subset and bounded execution.
- Every successful cell is atomic and retains forward and inverse mutations.
- Failed cells roll back exactly.
- Undo/redo, optimistic rollback, rebase, and local replay inspection operate on patches.
- At most one canonical proposal is in flight; stale bases revalidate and never append directly.
- Durable Objects store and globally order cells but do not execute simulation.
- Same ordered cells converge to the same deterministic hash.
- GPT-5.6 Designer output never commits without local validation and speculative execution.
- GPT-5.6 Luna selects an offered legal option and cannot invent source.
- Pixi is a replaceable projection; geometry and game state remain independent.
- OpenAI credentials remain server-side.

## Prism Foundry scope

Required physical systems:

- Mara and Ivo;
- finite Ruby, Sapphire, Emerald, Amber, and Prism tokens;
- seeded deck and six-card market;
- Take two different crystals;
- Buy card with permanent discounts and Prism wild payment;
- ordinary, Prism, and Echo cards;
- Rulebook and House Rules;
- first to 8 Prestige victory.

Explicitly excluded: map movement, threat, action points, hidden exploration, reserve, card tiers, nobles, accounts, marketplace, second game, runtime image generation, voice, 3D, arbitrary native JavaScript, CRDTs, and anti-cheat secrecy.

## Deployment and completion

The main URL and `/judge` must open without login or BYOK. Desktop and Pixel 7-sized paths must work. AI failure must leave a truthful, fully playable deterministic path. Persistent rooms, reconnect, convergence, rollback/rebase, and fork must remain operational.

The replacement is not product-approved merely because tests pass. M9 stays in progress and the release remains **AWAITING OWNER PRODUCT APPROVAL** until the owner explicitly accepts this product. No final tag or owner-only submission artifacts are requested during this gate.
