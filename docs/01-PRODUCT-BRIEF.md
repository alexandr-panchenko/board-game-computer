# Board Game Computer — frozen product brief

Status: replacement product implemented; **AWAITING OWNER PRODUCT APPROVAL**.

## Primary product statement

**Play the game. Rewrite the rules.**

Collect crystals, build your engine, and ask the table to add a new rule while you play.

The primary audience is a tabletop-game enthusiast or designer. The first screen speaks about playing, inventing rules, and seeing them change the live table. **Powered by a live, reversible program** is a secondary proof; interpreter and distributed-systems language belongs in Program, Advanced, and technical documentation.

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

1. This is Prism Foundry, a board game whose rules can change during play.
2. The goal is to reach 8 Prestige first.
3. Mara is the human seat, it is clear whose turn it is, and the highlighted table control is the next action.
4. **Change a rule** reaches the Table Agent.
5. **Program** inspects the live room source when the viewer wants technical proof.

## Primary experience

1. Select two highlighted crystals directly on the table and take them for Mara.
2. Watch Ivo visibly think, then let GPT-5.6 Luna choose from legal options only.
3. Ask GPT-5.6 Designer to add Ruby Resonance in the compact Table Agent.
4. See the House Rule become a physical part of the table.
5. Buy a Ruby card and watch payment, card movement, discounts, Prestige, refill, and the new Prism animate.
6. Optionally open Program at the exact appended cell and inspect the continuous room source.
7. Continue to a real 8-Prestige ending, or use history, sharing, reconnect, rebase, and fork.

## Required product surfaces

- **Table** — the permanent physical base: bank, market, deck, mats, tokens, cards, markers, Rulebook, House Rules, victory, and direct interaction.
- **Table Agent** — one chronological conversation with visibly distinct **Ivo · Player**, **Designer · Rules**, and user rule-request roles.
- **Program drawer** — one uninterrupted chronological notebook/REPL sequence with all setup, action, and Designer cells; the table remains visible beside it.
- **Share drawer** — discoverable persistent-room creation, short Room ID, role, connection, and Player invite.
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
