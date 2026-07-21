# Board Game Computer repository packet manifest

Status: **READY FOR CODEX**

This directory is the complete design-first initial repository content. Copy
all files, including dotfiles, into a new empty Git repository before starting
the primary Codex build session.

## First human actions

```bash
git init
git add .
git commit -m "chore: freeze Build Week product design and execution plan"
git branch -M main
# Add the intended GitHub remote, then push.
```

Do not insert secrets before the first commit. Configure deployment/API secrets
only in GitHub and Cloudflare secret stores.

## Root files

| File | Purpose |
|---|---|
| `AGENTS.md` | Binding implementation contract for Codex |
| `README.md` | Product, setup, architecture, AI, and collaboration overview |
| `JUDGING.md` | Short literal judge path |
| `STATUS.md` | Milestone status and cut line |
| `CODEX_KICKOFF.md` | Prompt for the primary build session |
| `HUMAN-VERIFICATION-CHECKLIST.md` | Human QA after milestone groups |
| `SUBMISSION-CHECKLIST.md` | Devpost/release checklist |
| `.env.example` | Non-secret configuration contract |
| `.gitignore` | Secret/build/tool exclusions |
| `LICENSE` | Planned MIT license |
| `THIRD_PARTY_NOTICES.md` | Dependency and asset provenance plan |

## Design documents

| File | Purpose |
|---|---|
| `docs/00-COMPETITION-CONSTRAINTS.md` | Verified competition constraints |
| `docs/01-PRODUCT-BRIEF.md` | Frozen product, audience, hero flow, scope |
| `docs/02-UX-AND-DEMO-FLOW.md` | Desktop/mobile UX and 90-second path |
| `docs/03-DECISION-LOG.md` | Accepted/rejected/deferred decisions |
| `docs/04-TECHNICAL-DESIGN.md` | Runtime, sync, Cloudflare, and OpenAI architecture |
| `docs/05-IMPLEMENTATION-PLAN.md` | Nine-milestone autonomous runbook |
| `docs/06-TEST-PLAN.md` | Semantic, rollback, rebase, Worker, E2E, and performance tests |
| `docs/07-SECURITY-COST-AND-DEPLOYMENT.md` | Trust, limits, secrets, budgets, CI/CD, rollback |
| `docs/08-SUBMISSION-EVIDENCE.md` | Claims-to-evidence matrix; initially pending |
| `docs/09-SUBMISSION-COPY-DRAFT.md` | Human-rewrite-required Devpost/video draft |
| `docs/10-REVIEW-PROMPTS.md` | Eligibility, rubric, and first-impression audits |
| `docs/11-PREEXISTING-WORK-DISCLOSURE.md` | Prior-experiment provenance boundary |
| `docs/12-LANGUAGE-AND-FRAMEWORK-REFERENCE.md` | Frozen reversible JavaScript subset and API |
| `docs/13-SAMPLE-GAME-SPEC.md` | Complete Shifting Vaults rules and fixtures |

## Design-packet validation performed

- required repository files and sections present;
- every milestone contains objective, affected files, steps, acceptance,
  validation commands, behavior, failure handling, dependencies, commit,
  cut option, and evidence;
- Markdown code fences balanced;
- relative Markdown links resolve;
- no Russian text in submission/repository documents;
- no reference to another project/submission;
- no native-eval, iframe, server-simulation, or full-replay main-path
  contradiction;
- strict OpenAI tool schemas use closed objects and required properties;
- stale executable cells cannot enter the canonical log before revalidation;
- one canonical proposal per client/room is in flight while later operations
  remain optimistic locally;
- deployment, video, commit, and evidence placeholders are explicitly marked
  rather than presented as completed work.

## Intentional pre-implementation placeholders

Production URL, YouTube URL, repository URL, exact commit SHA, Codex Session
ID, screenshots, test results, and evidence rows remain unfilled until they are
real. Do not replace them with invented values.
