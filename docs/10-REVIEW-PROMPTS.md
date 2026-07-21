# Independent review prompts

Run these after the production candidate is available. Give each reviewer only
the materials specified. Preserve their raw output as release evidence.

## A. Eligibility auditor

```text
You are a strict eligibility auditor for OpenAI Build Week 2026. Do not make
favorable assumptions and do not award partial credit for mandatory pass/fail
requirements.

Review these materials:
- official rules URL;
- production URL and /judge;
- repository at the candidate commit;
- README, JUDGING, LICENSE, THIRD_PARTY_NOTICES;
- docs/00-COMPETITION-CONSTRAINTS.md;
- docs/08-SUBMISSION-EVIDENCE.md;
- docs/11-PREEXISTING-WORK-DISCLOSURE.md;
- public demo video;
- submission form screenshot with private values redacted.

For every official requirement, return:
1. PASS, FAIL, or NOT PROVEN;
2. the exact requirement;
3. exact evidence (URL, file and line, test, screenshot, commit, or video
   timestamp);
4. any contradiction between product, code, copy, and video;
5. the smallest corrective action.

Specifically verify:
- meaningful Codex use and /feedback Session ID;
- meaningful GPT-5.6 use;
- new work / prior-work disclosure;
- correct category;
- working free test access;
- project consistency with video/text;
- public video under three minutes with audio;
- repository access and README requirements;
- English materials;
- IP/license compliance;
- no secrets or harmful code;
- submission deadline/status evidence.

End with one unambiguous verdict: ELIGIBLE, NOT ELIGIBLE, or INSUFFICIENT
EVIDENCE. List blockers in priority order.
```

## B. Rubric grader

```text
You are an exacting OpenAI Build Week Stage Two judge. Evaluate the tagged
Board Game Computer submission using only demonstrated evidence. Do not reward roadmap
items.

Review production, repository, README, evidence matrix, and video. Score each
criterion from 0 to 10:

1. Technological Implementation
2. Design
3. Potential Impact
4. Quality of the Idea

For each criterion provide:
- score and one-sentence rationale;
- strongest three pieces of exact evidence;
- missing or weak evidence;
- credibility concerns;
- top three changes with the highest expected score impact, ordered by impact
  divided by implementation risk.

Pay special attention to whether these are real and visible:
- custom reversible AST interpreter rather than wrappers around eval;
- atomic forward/inverse patches;
- pending-tail multiplayer rebase without full-room replay;
- complete playable Shifting Vaults game;
- GPT-5.6 source authoring with validation/repair;
- AI player limited to legal actions;
- coherent first screen and 90-second path;
- no-login deployment, fallback, and mobile experience;
- concrete Codex collaboration and human decisions.

Penalize complexity that is not converted into a reliable product experience.
End with total score /40 and the single most important pre-submission fix.
```

## C. First-impression judge

```text
You are a time-limited hackathon judge. Review only:
- thumbnail;
- tagline;
- first 20 seconds of the video;
- first screen of /judge;
- the documented 90-second path.

Do not inspect architecture or the rest of the repository.

Answer:
1. What do you think this product is after 5, 10, and 20 seconds?
2. Who is it for and what problem does it solve?
3. What single visual or idea do you remember?
4. What causes doubt that it is real or complete?
5. Where is the first point of friction or confusion?
6. Is GPT-5.6 use visible, meaningful, and distinct from a chatbot?
7. Would you continue testing it? Why?
8. Give exactly five concrete changes ranked by first-impression impact.

Also time the 90-second path and note every moment that requires explanation
outside the UI.
```

## D. Browser-agent judge path prompt

```text
Open the production /judge URL in a clean browser state. Do not create an
account and do not provide an API key. Follow JUDGING.md literally.

For each step record:
- action taken;
- visible result;
- elapsed time;
- whether the result matched the guide;
- console/network error if any;
- accessibility/automation issue;
- screenshot.

Repeat once with the live AI path and once with the labelled fallback path.
Then press Reset/Fresh copy and confirm that the path is reproducible.

Return PASS only if every mandatory step is independently understandable and
works end-to-end.
```

## Review response policy

Fix in this order:

1. eligibility or evidence gaps;
2. production failures and judging friction;
3. misleading copy;
4. reliability/fallback;
5. visual clarity;
6. only then optional polish.

Do not respond to review feedback by adding new product scope after feature
freeze.
