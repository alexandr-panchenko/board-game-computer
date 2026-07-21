# Product reset — owner rejection and Prism Foundry replacement

Date: **2026-07-21**  
Rejected production baseline:
`6fe6e435858a7d397636aaef4ebba3872b29a880`  
Release gate: **AWAITING OWNER PRODUCT APPROVAL**

## Decision

The product owner rejects the Shifting Vaults production experience represented
by the baseline above. The preceding human-UX correction was technically
verified: its local test matrix, CI deployment, production smoke, live AI path,
fallback path, and screenshots remain accurate records of what was tested.
Those results are regression evidence, not product acceptance.

The rejected sample does not demonstrate the intended room-as-program product:

- the visible game is primarily assembled by a bespoke
  `ShiftingVaultsGame` TypeScript class rather than chronological interpreted
  room source;
- React panels present important game-specific state outside the physical
  tabletop;
- Program shows a curated action subset rather than genesis, rules, setup, and
  the complete execution history;
- the board reads as labelled application rectangles rather than understandable
  tabletop components;
- a user cannot inspect the actual program that defines the visible game;
- the sample requires external explanation and hides the product's central
  technical idea.

The old screenshots in `docs/16-HUMAN-UX-AUDIT.md` and `evidence/local/` remain
historical evidence only. They must not be cited as approval evidence for the
replacement. Git history preserves the rejected implementation; no compatibility
layer or duplicate production bundle is required.

## Replacement product

The sole production sample becomes **Prism Foundry**, an original compact
two-player crystal-and-card engine-building game. Mara is the human seat and Ivo
is the AI/fallback seat. A player takes exactly one ordinary action: take two
different available ordinary crystals, or buy one face-up market card. Purchased
cards grant permanent color discounts and Prestige; Prism and Echo are the only
special card abilities. The first player to reach at least 8 Prestige wins.

Prism Foundry replaces Shifting Vaults on `/`, `/judge`, room templates,
production documentation, renderer projections, and sample-specific tests. It
is a replacement sample, not a second shipped game.

## Architectural acceptance gate

This reset is architectural and product-level, not cosmetic. The replacement is
acceptable only when all of the following are true:

1. A new room is created by executing one chronological genesis program whose
   real cells create the table, bank, mats, markers, tokens, card catalog, deck,
   market, actions, payment/discount rules, abilities, refill, turns, victory,
   setup, and Mara's first turn.
2. Game-specific content lives in interpreted source. TypeScript may expose
   generic transactional host primitives, but it must not contain a hidden
   monolithic canonical Prism Foundry game model.
3. React and Pixi project the interpreted runtime; neither keeps a second
   canonical game state.
4. Program is one uninterrupted chronological notebook from Cell 1 through the
   latest action or Designer cell, with real source, trace, patch metadata,
   undo/replay, and fork behavior.
5. The tabletop itself contains the crystal bank, visible token stacks, six-card
   market, deck/spent area, Mara and Ivo mats, purchased-card tableaus,
   discounts, Prestige, turn marker, Rulebook, House Rules, and winner state.
6. Seeded setup, market refill, fallback play, complete victory, undo/redo,
   multiplayer convergence, reconnect, rebase, and fork are deterministic.
7. GPT-5.6 Designer and Luna retain the existing validated boundaries and are
   adapted to Prism Foundry without weakening parser, interpreter, transaction,
   patch, security, or budget guarantees.

## Preserved platform

The Acorn parser/validator, custom AST interpreter, transactional store,
closures, forward/inverse patches, deterministic RNG and hash, atomic rollback,
fuel/collection limits, AI validation/repair, legal-option selection, labelled
fallback, Durable Object ordering/persistence, optimistic rollback/rebase,
reconnect, fork, Cloudflare deployment, CI, secret checks, license checks, and
useful generic geometry/rendering primitives remain the platform. They are not
redesigned unless a measured incompatibility blocks this replacement.

## Non-goals

- no backward compatibility for Shifting Vaults;
- no second shipped game;
- no accounts, marketplace, imports, 3D, physics, runtime image generation, or
  other major platform feature;
- no copied commercial names, wording, card catalog, visual identity, or art;
- no M9 completion, submission tag, or owner-only submission artifacts;
- no claim of product approval until the owner explicitly accepts the deployed
  replacement.

## Release state

Automated checks can prove determinism, reversibility, safety, completeness, and
deployment. They cannot grant product acceptance. Until the owner explicitly
accepts Prism Foundry, every status and release report must say:

> **AWAITING OWNER PRODUCT APPROVAL**

## Implementation record

The replacement uses `src/sample/prism-foundry/genesis.ts` as a 16-cell
executable room genesis. `PrismFoundryRoom` is an interpreter executor and
runtime projector, not a hidden rules implementation: all catalog data and
game-specific functions are declared by those cells. Program renders all 16
genesis cells and every later action or Designer cell in one sequence. The Pixi
projection draws the complete bank, market, deck, mats, tokens, discounts,
Prestige, turn marker, Rulebook, House Rules, purchased cards, and winner from
the runtime snapshot.

The current judge sequence is genesis inspection → Mara takes Ruby + Sapphire
→ Luna/fallback chooses for Ivo → Designer/offline example appends Ruby
resonance → Mara buys Crimson Relay and fires the new rule → continued ordinary
play to 8 Prestige. The rejected sample source has been deleted from the
production tree; Git history preserves it.

Validation and deployed identity are recorded in `STATUS.md` and
`docs/08-SUBMISSION-EVIDENCE.md`. Even after they pass, this document's release
gate remains unchanged until explicit human acceptance.

## Replacement viewport review

The rejected images below remain historical comparison evidence only. The
Prism Foundry images are the local post-reset candidate and must be recaptured
from the exact deployed commit after deployment.

| Viewport | Rejected baseline | Prism Foundry replacement |
|---|---|---|
| 1440 × 900 | [historical image](../evidence/local/ux-after-1440x900.png) | [current image](../evidence/local/prism-foundry-after-1440x900.png) |
| 1280 × 800 | [historical image](../evidence/local/ux-after-1280x800.png) | [current image](../evidence/local/prism-foundry-after-1280x800.png) |
| Pixel 7 | [historical image](../evidence/local/ux-after-pixel7.png) | [current image](../evidence/local/prism-foundry-after-pixel7.png) |

Five-second review of the replacement candidate:

1. **What is this?** A board game created by its room program.
2. **What is the goal?** First to 8 Prestige.
3. **What next?** Open the complete program, then follow the gold action.
4. **Where can AI change rules?** The first-level Change rules surface.
5. **Which character is mine?** Mara, identified on the turn card and physical mat.
