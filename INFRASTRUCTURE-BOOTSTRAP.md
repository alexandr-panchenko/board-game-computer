# Infrastructure bootstrap

Verified on 2026-07-21. This work covers repository and external infrastructure
preparation only; no application milestone has started.

## Repository

- Product: **Board Game Computer**
- Public repository: https://github.com/alexandr-panchenko/board-game-computer
- Default branch: `main`
- `origin`: `https://github.com/alexandr-panchenko/board-game-computer.git`
- Initial commit: `7b3d70b03ffcc7efb7c672052ac7a17d9b0a8639`
- Initial commit message: `chore: freeze Build Week product design and execution plan`
- The frozen design packet was renamed from the former TableScript working name
  before the initial commit.

## Installed and verified tools

| Tool | Version / status |
|---|---|
| Git | `2.54.0` |
| GitHub CLI | `2.94.0`; authenticated as `alexandr-panchenko` using the system keyring |
| Bun | `1.2.5` |
| Wrangler | `4.112.0` through `bunx wrangler` |

## Cloudflare authentication

- Wrangler OAuth authentication: verified
- Account name: `Sanocks@gmail.com's Account`
- Account ID: `02d0fb9e3205ef96a2c0d060302f64ff`
- No Cloudflare resources were created during bootstrap.
- Do not reuse Wrangler's local OAuth credential as a long-lived CI token.

## Secret handling

- `.gitignore` ignores `.dev.vars`, `.dev.vars.*`, `.env`, and `.env.*`, while
  retaining only safe example files.
- `.env.example` contains placeholder/empty values only.
- `.dev.vars` exists locally, is ignored by Git, and declares
  `OPENAI_API_KEY=`. The value was not populated or printed by Codex.
- Production `OPENAI_API_KEY` must later be stored as a Worker secret with
  `bunx wrangler secret put OPENAI_API_KEY` after the real Worker configuration
  exists.

## CI/CD prerequisites

No GitHub Actions secrets are configured yet, and no suitable long-lived
Cloudflare API token was present in the process environment.

Required repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

In the Cloudflare Dashboard, open **My Profile > API Tokens > Create Token**,
start from **Edit Cloudflare Workers**, and restrict the token to
`Sanocks@gmail.com's Account`. Keep only **Account / Workers Scripts / Edit**
and **Account / Account Settings / Read**. Add **Zone / Workers Routes / Edit**,
restricted to the deployment zone, only if the eventual Worker configuration
uses a custom route. Store the result directly in GitHub Actions or a secure
local environment variable; never put it in the repository or chat.

Configure the repository secrets without printing their values:

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --body "02d0fb9e3205ef96a2c0d060302f64ff"
gh secret set CLOUDFLARE_API_TOKEN
gh secret list
```

The second command reads the token interactively from standard input. Do not
place the token in shell history.

## Local OpenAI key

Open `.dev.vars` locally and paste the key after `OPENAI_API_KEY=`. Do not paste
it into chat. For example:

```bash
nano .dev.vars
```

Verify presence without printing the value:

```bash
awk -F= '/^[[:space:]]*OPENAI_API_KEY[[:space:]]*=/{v=$0; sub(/^[^=]*=/,"",v); found=(length(v)>0)} END{print found ? "OPENAI_API_KEY is set" : "OPENAI_API_KEY is not set"}' .dev.vars
git check-ignore -v .dev.vars
```

## Next-session verification

```bash
git status --short --branch
git remote -v
git log -1 --oneline
gh auth status
gh repo view --json nameWithOwner,url,visibility,defaultBranchRef
gh api repos/alexandr-panchenko/board-game-computer/commits/main --jq '.sha'
bun --version
bunx wrangler --version
bunx wrangler whoami
gh secret list
```

Do not begin `CODEX_KICKOFF.md` until the owner explicitly starts the primary
build session.
