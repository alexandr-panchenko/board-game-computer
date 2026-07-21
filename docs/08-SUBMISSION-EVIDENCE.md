# Board Game Computer — submission evidence ledger

Release state: **AWAITING OWNER PRODUCT APPROVAL**.

This ledger records reproducible evidence; it is not owner acceptance and does not authorize the final tag.

## Product-reset decision

- Rejected production baseline: `6fe6e435858a7d397636aaef4ebba3872b29a880`.
- Rejection record commit: `b515361` (`docs: record rejected product baseline`).
- Decision: `docs/17-PRODUCT-RESET.md` and D-057.
- The rejected UX was technically verified but did not prove room-as-program. Its screenshots in `docs/16-HUMAN-UX-AUDIT.md` are historical evidence only.

## Replacement implementation evidence

| Claim | Concrete source/test evidence |
|---|---|
| Complete game is interpreted source | `src/sample/prism-foundry/genesis.ts` contains 16 chronological executable cells |
| Runtime is canonical | `PrismFoundryRoom` executes `RoomRuntime`; React consumes `FoundrySnapshot`; renderer consumes the same projection |
| Full creation is inspectable | Program renders every `FoundryProgramCell.source`, not curated action summaries |
| Finite physical components | Genesis creates 23 token objects and 18 original cards; Pixi renders bank, deck, market, mats, tableaus, markers, Rulebook, House Rules |
| Atomic reversible play | Every genesis/action/Designer cell retains forward and inverse `RuntimePatch` plus before/after hashes |
| Complete ending | `tests/unit/sample/prism-foundry.test.ts` reaches at least 8 Prestige through registered `performAction` cells and closes legal options |
| Designer safety | `validateFoundryDesignerCandidate`, `speculateDesigner`, repair-loop tests, Worker schemas, and live path |
| Luna boundary and fallback | Player request contains opaque legal option IDs; invalid/unavailable response resolves to deterministic registered option |
| Shared room platform | Worker protocol tests plus desktop two-context convergence/reconnect/rollback/fork E2E |
| Responsive human path | Playwright desktop and Pixel 7 checks plus required manual screenshots |
| Original/repository-safe visuals | Procedural Pixi graphics, CSS, symbols, names, text; no external image assets |

## Prism Foundry genesis evidence

1. Physical table.
2. Finite central bank.
3. Mara and Ivo mats.
4. Prestige, discounts, turn, Rulebook, House Rules.
5. Twenty-three token objects.
6. Eighteen-card original seeded catalog.
7. Six-card face-up market.
8. Two ordinary registered actions.
9. Finite token movement.
10. Discount and wild payment.
11. Prism, Echo, and House Rules.
12. Deterministic refill.
13. One-action turn progression.
14. 8-Prestige victory.
15. Buy execution and legal-option materialization.
16. Setup and Mara's first turn.

Each cell has non-empty interpreted mutations and a deterministic resulting hash. Two fresh rooms converge.

## Judge-path evidence

Expected chronological tail after the mandatory path:

- Cell 17: Mara takes Ruby + Sapphire.
- Cell 18: Ivo takes Luna/fallback's legal pair.
- Cell 19: Designer adds Ruby resonance.
- Cell 20: Mara buys Crimson Relay and the new rule fires.

Program visibly links each cell to source, trace, mutation count, inverse retention, and state transition. The table shows payment, tableau, Prestige, Ruby discount, refill, and Prism movement.

## Validation record

Implementation commit `bac433fbc595c7fb9937aa242c2d88f1f4265d71`
passed GitHub Actions run `29843801799`; deploy job `88680538721` published and
smoke-tested that exact SHA at the apex domain.

| Check | Local result | CI/production result |
|---|---|---|
| format | passed 2026-07-21 | passed, run `29843801799` |
| lint | passed 2026-07-21 | passed, run `29843801799` |
| typecheck | passed 2026-07-21 | passed, run `29843801799` |
| unit | 43 passed across 9 files | passed, run `29843801799` |
| Worker | 14 passed across 3 files | passed, run `29843801799` |
| desktop E2E | 6 passed; mobile-only assertion skipped | passed, run `29843801799` |
| mobile E2E | 6 passed; desktop-only protocol journey skipped | passed, run `29843801799` |
| build | passed; known non-blocking Pixi chunk warning | passed, run `29843801799` |
| secret scan | passed for 121 repository files and build output | passed, run `29843801799` |
| license scan | passed for 27 direct dependencies | passed, run `29843801799` |
| live GPT-5.6 | production Luna legal selection, Designer validation/commit, and Ruby resonance trigger passed | passed at `https://boardgamecomputer.com/judge` |
| AI-disabled fallback | forced HTTP 503 for both AI endpoints; legal Luna fallback and labelled Designer example passed on Pixel 7 viewport | passed at `https://boardgamecomputer.com/judge` |
| exact deployed commit | `bac433fbc595c7fb9937aa242c2d88f1f4265d71` | production smoke passed for `/` and `/judge`; deploy job `88680538721` |

## Screenshot record

Local post-reset images are `evidence/local/prism-foundry-after-1440x900.png`,
`prism-foundry-after-1280x800.png`, and
`prism-foundry-after-pixel7.png`. Exact production captures are
`prism-foundry-production-1440x900.png`,
`prism-foundry-production-1280x800.png`, and
`prism-foundry-production-pixel7.png`. `docs/17-PRODUCT-RESET.md` links them
beside the rejected historical baseline.

## Owner-only evidence

Intentionally not requested during this gate: eligibility answers, private Codex Session ID, video, Devpost copy, attestations, final tag, and final submission action.
