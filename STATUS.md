# Build status

Last design review: **2026-07-21**

| Milestone | State | Last validation | Known issues | Next action | Commit |
|---|---|---|---|---|---|
| M0 — Frozen design packet | complete | Required-file, link, fence, architecture, scope, and consistency checks passed | Deployment/video/commit placeholders remain, as expected before implementation | Create the initial documentation commit and open the primary Codex session | `<initial-docs-commit>` |
| M1 — Repository and reproducible environment | complete locally; push blocked | `bun install --frozen-lockfile` and `bun run validate` passed 2026-07-21 | GitHub CLI authentication is invalid, so the required milestone push cannot complete | Re-authenticate GitHub CLI, push M1, then begin M2 | `PENDING_M1_COMMIT` |
| M2 — Deployable vertical slice | not started | — | No production URL | Deploy `/` and `/judge` shell through GitHub Actions | — |
| M3 — Reversible interpreter core | not started | — | Highest technical risk | Pass language, rollback, redo, fuel, and rebase gates | — |
| M4 — Table framework and complete deterministic sample | not started | — | Sample rules not implemented | Build geometry, renderer, actions, BDD, and playable Shifting Vaults | — |
| M5 — GPT-5.6 integration | not started | — | Requires server secret | Add Designer generation, repair loop, and AI player | — |
| M6 — Complete hero/judge flow | not started | — | Depends on M3–M5 | Guided replay → takeover → live rule → real ending | — |
| M7 — Persistent shared rooms and rebase | not started | — | May be cut only at the documented cut line | Durable Object storage, two clients, reconnect, fork | — |
| M8 — Reliability, mobile, security, and production verification | not started | — | Production behavior unknown | Complete fallbacks, budgets, E2E, clean-browser QA | — |
| M9 — Evidence and release freeze | not started | — | No real evidence yet | Fill evidence, record video, tag release, submit | — |

## Current gate

**EXTERNAL BLOCKER.** M1 implementation and validation are complete locally.
GitHub CLI re-authentication is required for its mandatory push before M2 can
begin. Cloudflare OAuth and the ignored local OpenAI key are available.

## Cut line

If time is critically constrained after M6, preserve the complete single-room
judge path and cut M7 collaboration polish before weakening the interpreter,
GPT-5.6 validation, complete game, deployment, or evidence.
