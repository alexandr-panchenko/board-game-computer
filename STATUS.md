# Build status

Last design review: **2026-07-22**

| Milestone | State | Last validation | Known issues | Next action | Commit |
|---|---|---|---|---|---|
| M0 — Frozen design packet | complete | Required-file, link, fence, architecture, scope, and consistency checks passed | Deployment/video/commit placeholders remain, as expected before implementation | Create the initial documentation commit and open the primary Codex session | `<initial-docs-commit>` |
| M1 — Repository and reproducible environment | complete | `bun install --frozen-lockfile` and `bun run validate` passed 2026-07-21 | GitHub CLI metadata/API access remains unavailable, but Git push succeeds | Maintain the reproducible baseline | `9e78db4`, evidence `0259e48` |
| M2 — Deployable vertical slice | complete | Local validation, production desktop/mobile smoke, and GitHub Actions validate/deploy passed 2026-07-21 | `gh` CLI API auth is invalid, but public Actions API and Git push work | Keep production healthy while implementing M3 | `7d7f276`, evidence `1ccf238` |
| M3 — Reversible interpreter core | complete | Full M3 command matrix and `bun run validate` passed 2026-07-21 | Optional callback array methods remain intentionally cut per M3 fallback | Preserve runtime invariants while building the table framework | `f902c0a` |
| M4 — Table framework and complete deterministic sample | complete | Local validation, production desktop/mobile gameplay, and GitHub Actions validate/deploy passed 2026-07-21 | Pixi bundle emits a non-blocking >500 kB chunk warning | Preserve the deterministic game while adding server-side AI | `e5732aa` |
| M5 — GPT-5.6 integration | complete | Local/live validation, production desktop/mobile paths, and GitHub Actions validate/deploy passed 2026-07-21 | None known beyond the existing Pixi bundle warning | Preserve validated AI and fallback behavior in the hero flow | `aab81ed` |
| M6 — Complete hero/judge flow | complete | Local validation, CI, exact production version, live AI path, and deployed desktop/mobile checks passed 2026-07-21 | None known beyond the existing Pixi bundle warning | Preserve the literal judge path while adding persistence | `405fe3a` |
| M7 — Persistent shared rooms and rebase | complete | Local validation, CI, exact production version, two-browser convergence/reload/fork passed 2026-07-21 | None known beyond the existing bundle warning | Preserve ordering and capability boundaries during hardening | `d9ebcda` |
| M8 — Reliability, mobile, security, and production verification | complete | Local/CI validation, apex exact-version smoke, 36-check production E2E, M7 rollback/M8 restore, and propagation-aware deploy passed 2026-07-21 | Known non-blocking Pixi chunk warning | Preserve the verified release while freezing evidence | `51dc131`, production gate `b1a270d` |
| M9 — Evidence and release freeze | in progress | Owner explicitly approved the deployed Prism Foundry replacement and final hero presentation on 2026-07-22 after the complete local, CI, production, live-AI, fallback, mobile, and room verification matrix | Owner-only submission artifacts and final tag remain outstanding; known non-blocking Pixi chunk warning remains | Preserve the approved product commit; keep M9 open and do not tag without a separate submission instruction | Approved product `0e4a7f8`; hero `b021fab`; rejected baseline `6fe6e43` |

## Current gate

**OWNER PRODUCT APPROVED. M9 REMAINS IN PROGRESS; DO NOT TAG.** The
owner rejected production baseline `6fe6e43` despite its green automated and
production verification. Prior tests and screenshots are historical regression
evidence, not approval. Decision D-057 and `docs/17-PRODUCT-RESET.md` require
Prism Foundry to replace that production sample through chronological
interpreted genesis cells. Replacement commit `bac433f` passed the complete
local and CI matrices, deployed successfully, and passed exact production,
live GPT-5.6, forced-offline, desktop, and mobile verification. On 2026-07-22,
the owner explicitly accepted the replacement and designated the approval
record as the final product commit. The
interpreter, transactional patches, deterministic runtime, AI boundaries,
Durable Object ordering, reconnect/rebase/fork, deployment, security, and CI
remain preserved. No owner-only submission artifact is part of this task. The
release product gate is therefore **OWNER PRODUCT APPROVED**.

Prism Foundry and the room-as-program architecture are now the accepted
foundation. `docs/18-HERO-POLISH-AUDIT.md` records the active final hero-track,
copy, interaction, Program, Table Agent, sharing, and visual-polish pass. This
work does not reopen the product architecture and does not change the release
gate.

Hero product commit `12bc62b3ed175eaeaf4b87f24bebaa17b5598e0b`
passed exact-SHA production verification through GitHub Actions run
`29871593555` and deploy job `88775307755`. The polished product is technically
verified and subsequently accepted by the owner on 2026-07-22.

## Cut line

If time is critically constrained after M6, preserve the complete single-room
judge path and cut M7 collaboration polish before weakening the interpreter,
GPT-5.6 validation, complete game, deployment, or evidence.
