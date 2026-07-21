# Pre-existing work disclosure and Build Week provenance

This file exists because the product owner previously explored a related idea
in an older hackathon/language-jam experiment more than six months before
OpenAI Build Week 2026.

## Prior exploration

The prior experiment explored, at a conceptual/prototype level:

- a multiplayer interactive system;
- a small programming language/runtime idea for game-like interaction;
- some of the product intuition behind a programmable tabletop.

It was built with older agents/models and was not a polished Build Week product.
The product owner has chosen to restate and redesign the project from first
principles in this repository rather than treating the old implementation as
the source of truth.

## Default reuse boundary

Unless this file is updated with exact details:

- **no source code from the old experiment is reused**;
- **no assets from the old experiment are reused**;
- **no old repository is copied or forked**;
- **no prior deployment is presented as Build Week work**.

Conceptual experience and general engineering knowledge are not represented as
new inventions. All repository implementation, tests, sample game, UX,
Cloudflare deployment, OpenAI integration, and documentation were created as
new Build Week work. Static generated art was not retained.

## New Build Week work to evidence

The final repository should show dated evidence for:

- frozen product and architecture packet;
- custom Acorn AST interpreter;
- scopes, closures, transactional heap, forward/inverse patches;
- optimistic pending-tail rebase;
- framework, BDD primitives, registered actions, geometry, and renderer;
- complete original `Prism Foundry` game and its interpreted genesis program;
- GPT-5.6 Designer and AI-player integration;
- Cloudflare Worker/Durable Object deployment;
- responsive judge experience, fallbacks, tests, and evidence;
- reliability/security hardening and production rollback evidence.

## If any prior artifact is reused

Before committing it:

1. identify the exact prior repository/file/asset;
2. record original creation date and ownership;
3. state why reuse is authorized;
4. list exact new modifications made during Build Week;
5. ensure license/IP compliance;
6. add an accepted decision to `docs/03-DECISION-LOG.md`;
7. update README and submission copy;
8. preserve a diff or other evidence distinguishing old from new.

## Final human attestation — complete before submission

- [ ] I reviewed the repository for copied prior code/assets.
- [ ] Any reused item is listed above with exact provenance.
- [ ] Git history clearly shows Build Week implementation dates.
- [ ] The primary Codex session and commits demonstrate the majority of new
      core functionality.
- [ ] The demo/video do not imply that prior work was created during Build Week.
- [ ] The Devpost description uses accurate wording about prior exploration.

## Suggested concise submission disclosure

Adapt in the author's voice only if accurate:

> I had previously explored the broad idea of a programmable multiplayer game
> environment in an older hackathon prototype. For Build Week I started a new
> repository and built the submitted implementation from scratch: the
> reversible AST interpreter, transactional patches, tabletop framework,
> Prism Foundry game, GPT-5.6 integration, Cloudflare room service, product
> experience, tests, and deployment are new work from the submission period.

Remove or revise this statement if any code or assets are actually reused.
