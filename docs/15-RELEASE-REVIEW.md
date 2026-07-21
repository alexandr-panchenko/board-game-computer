# Release review — Prism Foundry replacement

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

- [x] First viewport states **The board game is the program.**
- [x] First viewport names Prism Foundry and **First to 8 Prestige wins.**
- [x] Mara, turn, both Prestige values, complete table, and one gold next action are visible.
- [x] Table, Program, and Change rules are first-level surfaces.
- [x] Physical components use original procedural vector art rather than labelled room rectangles.
- [x] Legal copy is human-readable and primary UI does not expose internal IDs.
- [x] How to play is available from the first screen.
- [x] Advanced hashes and room internals are collapsed.
- [x] Mobile has fixed bottom navigation and a table-first first viewport.
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

The final row is filled with exact commands, dates, CI run, deployed commit, production smoke, and screenshots only after the replacement completes the full local and production matrix. Passing automation does not itself satisfy the owner acceptance checkbox.

## Release decision

Do not create `build-week-submission`. Do not mark M9 complete. Deploy and verify the replacement, then return it for human judgment with the release state unchanged: **AWAITING OWNER PRODUCT APPROVAL**.
