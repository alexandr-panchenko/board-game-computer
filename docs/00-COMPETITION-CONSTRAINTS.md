# OpenAI Build Week 2026 — competition constraints

Verified against the official OpenAI and Devpost pages on **2026-07-21**.
The official rules and current Devpost challenge page always take precedence
if anything changes.

## Project classification

- Track: **Apps for Your Life**
- Product type: consumer creativity and playtesting web application
- Submission language: English
- Target platform: modern desktop and mobile web browsers
- Deployment: Cloudflare Workers

## Dates

- Submission deadline: **2026-07-21 17:00 Pacific Time**
- Equivalent project deadline: **2026-07-22 04:00 Asia/Tbilisi**
- Judging period: 2026-07-22 through 2026-08-05 Pacific Time
- Winners announced: on or around 2026-08-12

## Mandatory project requirements

The submission must:

- be built with meaningful use of Codex and GPT-5.6;
- be new during the submission period, or clearly distinguish meaningful new
  work from any pre-existing experimentation;
- run consistently on its intended platform and match the video and written
  description;
- choose the single best-fitting category;
- provide a working website, demo, or test build free of charge through the
  judging period;
- provide a repository URL for judging and testing;
- use relevant licensing if public, or grant the required organizer access if
  private;
- provide a README with setup, sample data when needed, Codex collaboration,
  key human decisions, and GPT-5.6 usage;
- provide the `/feedback` Codex Session ID for the project thread where the
  majority of core functionality was built;
- provide an English project description;
- provide a public YouTube demo video shorter than three minutes;
- include audio in that video explaining what was built and how Codex and
  GPT-5.6 were used;
- avoid third-party trademarks, copyrighted music, and other unlicensed
  materials;
- comply with all third-party SDK/API/data licenses and terms.

The production judge path should not require registration, payment, or a user
API key. If any private testing access is unavoidable, credentials must be in
testing instructions; this project is designed to avoid that entirely.

## Pre-existing work requirement

The product owner previously explored a related concept in an older hackathon
prototype. This repository is designed as a new Build Week implementation.
`docs/11-PREEXISTING-WORK-DISCLOSURE.md` must be kept accurate and the final
submission must distinguish prior conceptual exploration from new code,
assets, architecture, commits, Codex work, and GPT-5.6 work.

Do not import old source or assets without an explicit disclosure update.

## Judging

Stage One is a pass/fail viability check: the project must fit the theme and
meaningfully apply the required tools.

Stage Two uses four equally weighted criteria:

1. **Technological Implementation** — genuine, non-trivial, working use of
   Codex and strong implementation quality.
2. **Design** — a complete, coherent, runnable product experience rather than
   only a technical proof of concept.
3. **Potential Impact** — a credible problem, real audience, and demonstrated
   solution.
4. **Quality of the Idea** — creativity, novelty, and differentiation from
   existing concepts.

Automated AI-driven analysis may be part of judging. Every material claim must
therefore have explicit evidence rather than relying on implication.

## Evidence implications for this repository

The release must preserve:

- dated Git history;
- primary Codex session evidence and `/feedback` Session ID;
- exact files showing GPT-5.6 integration;
- a verified production URL;
- repeatable `JUDGING.md` instructions;
- test output and screenshots;
- a tagged submission commit;
- asset and dependency provenance;
- a clear prior-work disclosure.

## Official references

- OpenAI Build Week overview: https://openai.com/build-week/
- Devpost challenge page: https://openai.devpost.com/
- Official rules: https://openai.devpost.com/rules
- GPT-5.6 model guidance: https://developers.openai.com/api/docs/guides/latest-model
- OpenAI Responses API: https://developers.openai.com/api/docs/guides/migrate-to-responses
- Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
- Cloudflare Durable Objects documentation: https://developers.cloudflare.com/durable-objects/
