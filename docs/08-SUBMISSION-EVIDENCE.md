# Submission evidence matrix

Do not replace `PENDING` with `VERIFIED` until the exact artifact exists and has
been personally checked against the tagged production build. General claims are
not evidence.

## Release identifiers

- Production URL: `PENDING`
- Judge URL: `PENDING`
- Repository URL: `PENDING`
- Public video URL: `PENDING`
- Submission commit: `PENDING`
- Submission tag: `build-week-submission` — `PENDING`
- Primary Codex `/feedback` Session ID: store securely and enter in Devpost —
  `PENDING`

## Milestone validation log

### M1 — Repository and reproducible environment

- Date: 2026-07-21
- Frozen install: `bun install --frozen-lockfile` checked 238 installs across
  315 packages with no changes.
- Full non-live validation: `bun run validate` passed formatting, ESLint,
  strict TypeScript, one unit test, one Workers-runtime test, two Playwright
  tests (desktop and mobile), production build, tracked/build-output secret
  scan, and 26-direct-dependency license scan.
- CI workflow: `.github/workflows/validate.yml`.
- Smoke tests: `tests/unit/versions.test.ts`,
  `tests/workers/health.test.ts`, and `tests/e2e/judge-shell.spec.ts`.
- Initial implementation tree: `src/app`, `src/shared`, `src/worker`,
  `scripts`, and `tests/{unit,workers,e2e}`.
- Commit SHA: `PENDING_M1_COMMIT`.

## Requirements and judging evidence

| Status | Requirement / criterion | Claim to verify | Exact evidence required | URL/file/video timestamp | Verification method |
|---|---|---|---|---|---|
| PENDING | Working project | Production app consistently loads and functions as described | Clean-browser production E2E result, health endpoint, screenshot | `<prod>/`, `<prod>/api/health`, artifact path | Open incognito and run smoke test |
| PENDING | Apps for Your Life category | Product serves consumer creativity/playtesting | Product brief plus working first screen and Devpost category screenshot | `docs/01-PRODUCT-BRIEF.md`, Devpost screenshot | Compare category wording to demo |
| PENDING | New/meaningful Build Week work | Repository implementation is new and prior exploration is disclosed | Initial/final commit history, Codex session dates, disclosure file | `docs/11-PREEXISTING-WORK-DISCLOSURE.md`, Git log | Audit dates and reused files |
| PENDING | Codex use | Primary Codex session built majority of core functionality | `/feedback` Session ID, commit history, README concrete examples | Session ID in form; README section; commits | Match session work to core files |
| PENDING | GPT-5.6 use | GPT-5.6 authors a validated room cell and AI player chooses a legal action | Integration files, live trace, committed cell, video timestamps | `src/worker/ai/*`, video `mm:ss` | Inspect code and run live path |
| PENDING | Free testing access | Judge can use app without payment | Incognito path recording | `<prod>/judge`, video timestamp | No account/payment prompt |
| PENDING | No login / BYOK | Judge path needs no registration or user key | JUDGING steps and clean-browser screenshot | `JUDGING.md`, screenshot | Follow instructions literally |
| PENDING | Public demo video | Video is public YouTube, under three minutes, with audio | YouTube page and duration | `<youtube-url>` | Incognito playback |
| PENDING | Video explains Codex and GPT-5.6 | Audio explicitly covers both | Transcript/timestamps | Video `mm:ss–mm:ss` | Listen and compare transcript |
| PENDING | Repository access/license | Repo is public with MIT or organizer access is granted | Repo settings, LICENSE | `<repo-url>`, `LICENSE` | Open unauthenticated or verify invites |
| PENDING | README completeness | Setup, tests, sample, Codex, human decisions, GPT usage are concrete | Final README sections | `README.md` | Fresh-reader audit |
| PENDING | `/feedback` Session ID | Correct primary project thread ID entered | Devpost form screenshot/private record | Devpost submission | Human verification |
| PENDING | English materials | UI, README, testing instructions, copy, and video are English | Screenshots/files/transcript | Multiple | Manual audit |
| PENDING | Original/IP-safe assets | No commercial game trademarks, copied rules, or unlicensed art/music | Asset manifest, notices, video audio review | `THIRD_PARTY_NOTICES.md`, asset manifest | License/provenance audit |
| PENDING | Technological Implementation | Custom reversible interpreter is real and non-trivial | Source files, rollback/rebase tests, architecture section | `src/runtime/**`, test output, video timestamp | Code review and execute tests |
| PENDING | Reversible cells | Every successful cell records forward/inverse patches | Patch tests and runtime inspector | test names/output, screenshot | Verify hash round-trip |
| PENDING | Atomic failure | Failed source leaves exact pre-cell state | Failure/hash test output | test artifact | Run targeted test |
| PENDING | No full-room replay in rebase | Ordinary multiplayer rebase touches only local pending tail | Instrumented test and two-client trace | test output, video timestamp | Assert committed-history execute count is zero |
| PENDING | Determinism | Independent clients/runtimes converge to same hash | convergence test output | test artifact | Run twice/two contexts |
| PENDING | Complete game | Shifting Vaults can be played to real victory and collapse | E2E victory/loss traces and manual play recording | test artifacts, video/screenshot | Start fresh and finish |
| PENDING | Design coherence | First screen, replay, takeover, agent change form one clear experience | 90-second recording and first-impression review | video `00:00–01:30` | External review prompt |
| PENDING | First-screen value | Working table appears before AI call | performance trace/screenshot | `<prod>/judge`, video `00:00` | Disable network/OpenAI and load |
| PENDING | Guided causality | Highlighted cell and trace match visible table change | screenshot/video and E2E assertions | video `mm:ss` | Compare source ID/trace/entity |
| PENDING | Human legal action | Direct manipulation/action list commits valid Player cell | E2E trace | video `mm:ss`, test output | Verify action source and state |
| PENDING | AI legal action | Model/fallback chooses only a materialized legal action | AI fixture/live trace | video `mm:ss`, logs/test | Compare chosen ID to option list |
| PENDING | Live rule change | Blue-gate Scenario is model-authored, validated, committed, and fires | source cell screenshot, trace, resulting rotation | video `mm:ss`, room export | Inspect committed source and effect |
| PENDING | Repair loop | Invalid model output can repair without polluting log | mocked repair test and attempt telemetry | test output | Count committed vs failed candidates |
| PENDING | AI fallback | App remains playable with AI disabled | AI-disabled E2E and labelled UI screenshot | test output, screenshot | Set `AI_ENABLED=false` |
| PENDING | Reset/fresh copy | Judge path can be reproduced | repeated E2E and new room URL | JUDGING, test output | Run twice in clean state |
| PENDING | Mobile support | Minimum mobile viewport completes judge path | Playwright mobile trace and real-device screenshot | artifact paths | Execute full path |
| PENDING | Semantic controls | Key status/actions exist outside canvas | DOM snapshot/accessibility scan/manual | test output, screenshot | Keyboard/browser-agent check |
| PENDING | Shared room | Two clients order cells, reconnect, and converge | two-browser E2E/video | test output, video timestamp | Simultaneous actions and reload |
| PENDING | Replay/fork | Local patch time travel and persistent prefix fork work | E2E, parent/child URLs, hashes | test output | Inspect parent unchanged |
| PENDING | Custom geometry | Zone relations use vector kernel, not pixel hit testing | geometry source/tests/debug overlay | `src/geometry/**`, artifact | Code review and fixtures |
| PENDING | Static AI-generated art | Art was generated specifically for project and has fallback/provenance | asset manifest, prompt/model/date, fallback screenshot | manifest/files | Disable asset load and compare |
| PENDING | Secret safety | No OpenAI/Cloudflare/capability secret in tracked files or bundle | secret scan output and manual bundle search | CI artifact | Run scan on tagged commit |
| PENDING | Cost control | Per-room/global budgets and kill switch work | Worker tests and forced-limit screenshot | test output | Trigger limits in test env |
| PENDING | Cloudflare deployment | Worker, static assets, SQLite DO, and WebSockets are deployed | Wrangler config, deploy run, health, room test | files/Actions URL | Production smoke |
| PENDING | Test reproducibility | Clean clone passes documented validation | clean-clone log/CI | Actions run URL | New checkout with frozen lockfile |
| PENDING | Potential impact | Demo credibly shortens idea-to-playtest loop for target user | user narrative tied to working sequence | Devpost story + demo | Reviewer evaluates demonstrated path |
| PENDING | Quality/novelty | One language unifies creation, play, AI actions, reversibility, and sharing | architecture plus visible demo | tech design, video | Rubric grader evidence review |
| PENDING | Submission freeze | Production and materials correspond to tagged commit | version endpoint, tag, deploy metadata | `<prod>/api/version`, Git tag | Compare SHA everywhere |

## Screenshot targets

Capture at minimum:

1. first loaded table with Script and Replay visible;
2. replay cell + matching trace/table highlight;
3. direct legal-action targets;
4. AI-player action and reason;
5. committed blue-gate Scenario source;
6. connected room rotating with trigger trace;
7. game victory or collapse;
8. mobile judge layout;
9. two-client shared room if M7 ships;
10. labelled fallback;
11. reset/fresh copy;
12. test/CI/deploy success.

## Video evidence targets

Fill after edit:

| Segment | Target timestamp | Final timestamp | Verified |
|---|---:|---:|---|
| Immediate working table | 00:00–00:10 | PENDING | [ ] |
| Replay causality | 00:10–00:28 | PENDING | [ ] |
| Human and AI turns | 00:28–00:45 | PENDING | [ ] |
| GPT-5.6 live rule authoring | 00:45–01:12 | PENDING | [ ] |
| Triggered blue-gate effect | 01:12–01:25 | PENDING | [ ] |
| Interpreter/rebase architecture | 01:25–01:48 | PENDING | [ ] |
| Codex collaboration | 01:48–02:05 | PENDING | [ ] |
| Impact, complete game, close | 02:05–02:20 | PENDING | [ ] |

## Final evidence rule

If a feature was cut or is unreliable:

- remove the claim from README/copy/video;
- mark the row `CUT` with the exact decision/commit;
- do not use future-tense language to imply it works now.
