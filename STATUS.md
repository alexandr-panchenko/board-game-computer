# Build status

Last design review: **2026-07-21**

| Milestone | State | Last validation | Known issues | Next action | Commit |
|---|---|---|---|---|---|
| M0 — Frozen design packet | complete | Required-file, link, fence, architecture, scope, and consistency checks passed | Deployment/video/commit placeholders remain, as expected before implementation | Create the initial documentation commit and open the primary Codex session | `<initial-docs-commit>` |
| M1 — Repository and reproducible environment | complete | `bun install --frozen-lockfile` and `bun run validate` passed 2026-07-21 | GitHub CLI metadata/API access remains unavailable, but Git push succeeds | Maintain the reproducible baseline | `9e78db4`, evidence `0259e48` |
| M2 — Deployable vertical slice | complete | Local validation, production desktop/mobile smoke, and GitHub Actions validate/deploy passed 2026-07-21 | `gh` CLI API auth is invalid, but public Actions API and Git push work | Keep production healthy while implementing M3 | `7d7f276`, evidence `1ccf238` |
| M3 — Reversible interpreter core | complete | Full M3 command matrix and `bun run validate` passed 2026-07-21 | Optional callback array methods remain intentionally cut per M3 fallback | Preserve runtime invariants while building the table framework | `f902c0a` |
| M4 — Table framework and complete deterministic sample | complete | Local validation, production desktop/mobile gameplay, and GitHub Actions validate/deploy passed 2026-07-21 | Pixi bundle emits a non-blocking >500 kB chunk warning | Preserve the deterministic game while adding server-side AI | `e5732aa` |
| M5 — GPT-5.6 integration | in progress | Infrastructure and server-secret readiness audit next | Requires server-only secret and bounded live-call verification | Add Designer generation, repair loop, and AI player | — |
| M6 — Complete hero/judge flow | not started | — | Depends on M3–M5 | Guided replay → takeover → live rule → real ending | — |
| M7 — Persistent shared rooms and rebase | not started | — | May be cut only at the documented cut line | Durable Object storage, two clients, reconnect, fork | — |
| M8 — Reliability, mobile, security, and production verification | not started | — | Production behavior unknown | Complete fallbacks, budgets, E2E, clean-browser QA | — |
| M9 — Evidence and release freeze | not started | — | No real evidence yet | Fill evidence, record video, tag release, submit | — |

## Current gate

**M5 IN PROGRESS.** M4 commit `e5732aa` passed GitHub Actions validation and
deployment, production reports the same commit, and six production
desktop/mobile browser checks passed. The active gate is bounded server-side
GPT-5.6 generation and legal-action selection with deterministic fallback.

## Cut line

If time is critically constrained after M6, preserve the complete single-room
judge path and cut M7 collaboration polish before weakening the interpreter,
GPT-5.6 validation, complete game, deployment, or evidence.
