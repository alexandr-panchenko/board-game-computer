# Board Game Computer — kickoff prompt for the primary Codex build session

You are the primary implementation agent for this OpenAI Build Week project.
Work autonomously milestone by milestone and return only when the repository is
submission-ready or a true blocker requires the user.

## Source of truth

Read completely, in this order:

1. `AGENTS.md`
2. `docs/00-COMPETITION-CONSTRAINTS.md`
3. `docs/01-PRODUCT-BRIEF.md`
4. `docs/02-UX-AND-DEMO-FLOW.md`
5. `docs/03-DECISION-LOG.md`
6. `docs/04-TECHNICAL-DESIGN.md`
7. `docs/12-LANGUAGE-AND-FRAMEWORK-REFERENCE.md`
8. `docs/13-SAMPLE-GAME-SPEC.md`
9. `docs/05-IMPLEMENTATION-PLAN.md`
10. `docs/06-TEST-PLAN.md`
11. `docs/07-SECURITY-COST-AND-DEPLOYMENT.md`
12. `docs/08-SUBMISSION-EVIDENCE.md`
13. `docs/11-PREEXISTING-WORK-DISCLOSURE.md`
14. `STATUS.md`

These documents are binding. Do not redesign the product, replace the
reversible interpreter, or add features outside the frozen scope.

## Before code changes

1. Inspect branch, Git status, repository tree, and existing commits.
2. Confirm the environment and available tools.
3. Scan tracked files for secrets.
4. Summarize the milestones and any real blockers.
5. If no true blocker exists, begin M1 immediately without asking for approval.

Ask the user only for:

- a missing external credential required for the current milestone;
- an irreversible external action;
- a material contradiction in source-of-truth documents;
- a requirement proven impossible with the selected architecture;
- a credible privacy, secret, or substantial-cost risk.

Use accepted defaults for everything else.

## Non-negotiable architecture

- Browser-side Acorn parser plus custom TypeScript AST interpreter.
- Custom runtime scopes, slots, heap, functions, and closures.
- Transaction journal with forward and inverse patches for every cell.
- Cheap rollback/reapply of only local pending cells during multiplayer rebase.
- Deterministic PRNG and canonical state hashing.
- Registered actions for players and AI; Designer may submit allowed source.
- Cloudflare Durable Object stores/orders/broadcasts cells but never simulates.
- React UI, PixiJS rendering adapter, independent vector geometry kernel.
- No native `eval`, `Function`, WebAssembly, native host objects, or network
  access from interpreted code.

## Milestone execution

For each milestone in `docs/05-IMPLEMENTATION-PLAN.md`:

1. Mark it `in progress` in `STATUS.md`.
2. Implement only its listed scope.
3. Add or update tests.
4. Run every listed validation command.
5. Fix all failures before continuing.
6. Review the diff for scope creep, secrets, and accidental fake AI behavior.
7. Update documentation, status, and exact evidence.
8. Commit with the specified message.
9. Move to the next milestone without asking for confirmation.

Do not leave the main branch in a partially broken state. Deploy working slices
early and keep the production judge path usable.

## Time-priority order

1. production deployment;
2. reversible interpreter correctness;
3. complete deterministic Shifting Vaults game;
4. complete guided judge path;
5. visible, validated GPT-5.6 Designer integration;
6. legal AI-player action;
7. fallback and reliability;
8. room sharing/rebase;
9. polish and additional evidence.

If M7 cannot fit, activate the documented cut line. Never cut validation,
complete-game ending, or deployment to preserve optional polish.

## Required engineering behavior

- Never commit secrets or `.dev.vars`.
- Keep the OpenAI key server-side.
- Validate every model output before state changes.
- Use strict function schemas and source-located diagnostics.
- Allow at most three model repair attempts.
- Keep a clearly labelled deterministic AI fallback.
- Keep `/judge` and the main URL free of login, BYOK, CAPTCHA, and WAF friction.
- Preserve mobile usability and semantic HTML controls around the canvas.
- Record dependency licenses.
- Do not claim evidence that has not been observed.
- Do not replace live AI with a mock outside tests or the explicitly labelled
  fallback.
- Do not modify the architecture without adding an accepted decision entry.

## Final verification

After M9:

1. Run format, lint, typecheck, unit, Workers integration, E2E, build, secret,
   and license checks.
2. Verify the production URL in a clean desktop and mobile browser state.
3. Follow `JUDGING.md` literally.
4. Verify live GPT success, timeout/failure, fallback, reset, and fresh-copy
   behavior.
5. Verify two-browser convergence if M7 was completed.
6. Verify no secret appears in source, bundle, source maps, logs, or screenshots.
7. Fill `docs/08-SUBMISSION-EVIDENCE.md` only with real links, files, test
   output, screenshots, commits, and video timestamps.
8. Record the primary Codex `/feedback` Session ID outside the public repository
   unless the submission form requires it there.
9. Commit the release and create tag `build-week-submission`.
10. Report implementation, cuts, validation results, production URL,
    commit/tag, known risks, and readiness for video/submission.

Do not declare the project complete until the mandatory judge path works
end-to-end in production.
