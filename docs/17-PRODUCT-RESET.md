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

The reset architecture remains accepted, while its initial presentation was
superseded by the focused hero pass. The current judge sequence is direct table
play: Mara selects Ruby and Sapphire → Luna/fallback automatically chooses for
Ivo → the Table Agent appends Ruby Resonance → Mara buys Crimson Relay and
fires the new rule → optional Program inspection at the exact appended cell →
continued ordinary play to 8 Prestige. Program remains complete, but no longer
blocks understanding the game. The rejected sample source has been deleted
from the production tree; Git history preserves it.

Validation and deployed identity are recorded in `STATUS.md` and
`docs/08-SUBMISSION-EVIDENCE.md`. Even after they pass, this document's release
gate remains unchanged until explicit human acceptance.

Implementation commit `bac433fbc595c7fb9937aa242c2d88f1f4265d71`
passed the complete local validation matrix, GitHub Actions run `29843801799`,
deploy job `88680538721`, exact-version apex smoke, clean desktop and mobile
production E2E, the live GPT-5.6 Luna and Designer path, and a separately forced
AI-disabled path. This is technical verification, not product acceptance.

## Replacement viewport review

The rejected images below remain historical comparison evidence only. The
Prism Foundry images were captured from the verified production replacement.

| Viewport | Rejected baseline | Prism Foundry replacement |
|---|---|---|
| 1440 × 900 | [historical image](../evidence/local/ux-after-1440x900.png) | [production replacement](../evidence/local/prism-foundry-production-1440x900.png) |
| 1280 × 800 | [historical image](../evidence/local/ux-after-1280x800.png) | [production replacement](../evidence/local/prism-foundry-production-1280x800.png) |
| Pixel 7 | [historical image](../evidence/local/ux-after-pixel7.png) | [production replacement](../evidence/local/prism-foundry-production-pixel7.png) |

Five-second review of the replacement candidate:

This historical screenshot review describes the first Prism Foundry presentation,
not the final hero candidate. Its required Program-first next step was later
removed. Current hero evidence and the eight-question five-second review are in
`docs/18-HERO-POLISH-AUDIT.md`.
