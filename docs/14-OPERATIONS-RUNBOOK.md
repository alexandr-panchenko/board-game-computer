# Production operations runbook

This runbook covers the reversible Cloudflare deployment used for Board Game
Computer. It must be exercised before the submission freeze; never paste API
tokens, room capabilities, request headers, or `.dev.vars` contents into an
incident record.

## Production endpoints

- Canonical domain: `https://boardgamecomputer.com`
- Worker fallback: `https://board-game-computer.sanocks.workers.dev`
- Health: `/api/health`
- Exact version: `/api/version`
- Judge path: `/judge`

The apex route is a Cloudflare Worker custom domain. The `test` Wrangler
environment has an explicit empty route list so it cannot claim production.

## Deploy and verify

1. Preserve the current version ID from `bunx wrangler deployments list`.
2. Run `bun run validate` and the additional M8 AI-disabled/mobile commands.
3. Commit and push the exact source. GitHub Actions builds with the full commit
   SHA, deploys it, and runs `bun run smoke:production`.
4. Confirm `/api/version` equals the pushed SHA on both production endpoints.
5. Follow `JUDGING.md` in clean desktop and mobile browser contexts. Confirm no
   login, user key, console error, or capability text is exposed.

The smoke command can also target the apex explicitly:

```bash
PRODUCTION_URL=https://boardgamecomputer.com EXPECTED_COMMIT=<sha> bun run smoke:production
```

## Roll back and restore

List deployment history and identify the exact previous version:

```bash
bunx wrangler deployments list
bunx wrangler versions list
```

Roll back non-interactively, then verify the version and judge path:

```bash
bunx wrangler rollback <previous-version-id> --message "M8 rollback verification" --yes
EXPECTED_COMMIT=<previous-sha> bun run smoke:production
```

Restore the newly verified release at 100% traffic and smoke it again:

```bash
bunx wrangler versions deploy <release-version-id>@100% --message "Restore verified M8 release" --yes
EXPECTED_COMMIT=<release-sha> bun run smoke:production
```

The first M8 exercise uses M7 version
`e9b7bc22-dec6-4787-9b73-46ce0d70ecf6` (commit `d9ebcda`) as the known-good
rollback target. Record the resulting M8 version ID and both smoke results in
`docs/08-SUBMISSION-EVIDENCE.md`.

## Incident priorities

1. Set `AI_ENABLED=false` or rotate the OpenAI secret for AI cost/key risk.
2. Roll back for broad UI, room, or protocol failure.
3. Rotate affected Cloudflare/GitHub credentials for control-plane exposure.
4. Preserve only redacted diagnostics, repair, rerun full validation, and
   update evidence honestly.

