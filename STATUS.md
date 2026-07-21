# Build status

Last design review: **2026-07-21**

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
| M9 — Evidence and release freeze | in progress | Human-UX correction passed local validation, CI/deploy, clean desktop/mobile production checks, live GPT-5.6, and deployed fallback 2026-07-21 | Owner eligibility/video/Session ID/copy/submission and final tag remain intentionally blocked | Preserve the verified human-first candidate; await only owner artifacts without finalizing M9 | `f2d7130` UX candidate; run `29830796839` |

## Current gate

**M9 REMAINS IN PROGRESS; DO NOT TAG.** The human-UX correction passes the full
local matrix: 50 unit, 14 Worker, and 42 desktop/mobile E2E checks plus format,
lint, strict typecheck, build, repository/build secret scan, and 27 direct
dependency licenses. Commits `d2ea30a` and `f2d7130` are pushed. GitHub Actions
run `29830796839` passed validation and deployed the exact commit; apex version
and security smoke passed. Clean Chromium checks of `/` and `/judge` passed at
1440 × 900 and Pixel 7 with no console errors. The production live path passed
with HTTP 200 from Luna and Designer, a locally validated committed rule, and a
visible rule trigger; the deployed labelled fallback passed independently.
`docs/16-HUMAN-UX-AUDIT.md` records the audit, matched captures, and five-second
review. Intentional owner blockers remain: official eligibility, narrated
video, primary `/feedback` Session ID, author-voice copy, prior-work/physical-
device attestations, and Devpost submission. M9 remains in progress until those
external requirements exist; do not create `build-week-submission` early.

## Cut line

If time is critically constrained after M6, preserve the complete single-room
judge path and cut M7 collaboration polish before weakening the interpreter,
GPT-5.6 validation, complete game, deployment, or evidence.
