# Release review — Prism Foundry hero candidate

Review date: 2026-07-21

Release state: **AWAITING OWNER PRODUCT APPROVAL**

M9 remains in progress. The final tag, eligibility confirmation, Codex Session ID, video, Devpost copy, and attestations are intentionally outside this product-reset gate.

## Architectural acceptance checklist

- [x] The production sample is Prism Foundry on `/`, `/judge`, and new room templates.
- [x] The rejected sample source and sample-specific E2E expectations are absent from the production tree.
- [x] A new room executes 16 real genesis cells instead of loading an opaque game snapshot.
- [x] Crystal definitions, finite bank, player mats, card catalog, market, actions, payment, discounts, abilities, refill, turns, victory, setup, and House Rules live in interpreted source.
- [x] React does not hold a second canonical game model.
- [x] Pixi projects runtime-derived cards, tokens, bank, mats, discounts, Prestige, turn marker, Rulebook, House Rules, and winner state.
- [x] Program exposes genesis plus all action and Designer cells in one chronological sequence.
- [x] The preserved interpreter, patches, deterministic hashes, AI boundaries, Durable Objects, reconnect, rebase, and fork remain in use.

## Human-product checklist

- [x] First viewport says **Play the game. Rewrite the rules.** for tabletop players and designers.
- [x] First viewport names Prism Foundry, says **Be the first player to reach 8 Prestige**, and explains the one-action turn.
- [x] Mara, Ivo, current turn, complete table, and one dominant next action are visible.
- [x] Crystal stacks and market cards are the primary direct interactions.
- [x] Ivo visibly thinks and plays automatically, with a recovery action on failure.
- [x] Table Agent combines chronological Ivo and Designer messages while preserving explicit authority labels.
- [x] Program and Table Agent open as closeable drawers without replacing the table.
- [x] Program is continuous syntax-highlighted chronological source with technical evidence collapsed.
- [x] Rulebook is a physical table interaction; the repeated bottom How to Play grid is absent.
- [x] Local versus persistent-room state, Create shared room, and Player invite are discoverable.
- [x] Physical components use original procedural vector art rather than labelled room rectangles.
- [x] Legal copy is human-readable and primary UI does not expose internal IDs.
- [x] Advanced hashes and room internals are collapsed.
- [x] Mobile retains the table as base and uses touch-safe drawers.
- [x] Full hero-polish local validation passed, including desktop/mobile hero and shared-room automation.
- [x] Exact-SHA clean-clone, CI, deployment, live model, fallback, and shared-room production verification passed for `12bc62b`.
- [ ] Explicit owner product acceptance has not yet been received.

## Mandatory behavior checklist

- [x] Mara takes two different finite bank tokens.
- [x] Buy applies discounts, matching payment, wild Prism, tableau movement, Prestige, ability, refill, victory, and turn progression atomically.
- [x] Prism, Echo, and ordinary cards exist.
- [x] Deterministic registered actions reach a real 8-Prestige ending.
- [x] GPT-5.6 Luna receives only legal options.
- [x] GPT-5.6 Designer candidate is parsed, validated, speculatively executed, exactly reversed, then committed.
- [x] Ruby resonance appears on the physical House Rules card and fires on a Ruby purchase.
- [x] AI-disabled fallback completes the same proof truthfully.
- [x] Undo/redo use retained inverse/forward patches.
- [x] Persistent-room convergence, reconnect, stale-base handling, rollback/rebase, and fork remain covered.

## Validation gate

Hero commit `12bc62b3ed175eaeaf4b87f24bebaa17b5598e0b` passed GitHub Actions run `29871593555`, deploy job `88775307755`, exact production smoke, live Luna/Designer play, forced fallback, desktop/mobile E2E, and two-browser sharing. Passing this matrix does not itself satisfy the owner acceptance checkbox.

## Release decision

Do not create `build-week-submission`. Do not mark M9 complete. Deploy and verify the hero candidate, then return it for human judgment with the release state unchanged: **AWAITING OWNER PRODUCT APPROVAL**.
