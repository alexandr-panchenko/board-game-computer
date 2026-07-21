# Human verification checklist

Use this after Codex completes a milestone group and before release.

## Product and judge path

- [ ] Main URL opens with no login, BYOK, CAPTCHA, or challenge.
- [ ] `/judge` opens the same reproducible demo.
- [ ] The first screen is visually complete before any AI request.
- [ ] Guided replay clearly links cells, trace, and table changes.
- [ ] **Take control** produces a legal human action.
- [ ] The AI player chooses a legal registered action.
- [ ] The prepared Designer prompt commits a valid source cell.
- [ ] The blue-gate rule visibly fires.
- [ ] The game can reach a real win/loss in 10–15 minutes.
- [ ] Reset/fresh copy reproduces the demo.
- [ ] The labelled example-rule fallback works with OpenAI disabled.

## Multiplayer and time travel

- [ ] Two browser contexts receive the same global cell order.
- [ ] Concurrent local operations rollback only pending patches, not the room.
- [ ] Both clients converge to the same state hash.
- [ ] Reconnect retrieves missing cells.
- [ ] Timeline back/forward uses inverse/forward patches.
- [ ] `Fork from here` creates a new persistent room only when saved/shared.

## Mobile and UX

- [ ] Minimum target mobile viewport can complete the judge path.
- [ ] Drag, tap, pan, and zoom do not fight browser scrolling.
- [ ] Chat, Script, and Replay panels are reachable as bottom sheets/tabs.
- [ ] Buttons and action list have semantic labels.
- [ ] No essential instruction exists only as tiny canvas text.
- [ ] Loading and repair progress is understandable without raw token output.

## Reliability and safety

- [ ] Invalid generated source never enters the committed log.
- [ ] Failed transactions restore the exact state hash.
- [ ] API timeout leaves the room playable.
- [ ] Rate and budget limits do not block the normal judge path.
- [ ] OpenAI key is absent from the browser bundle and network responses.
- [ ] Room capability tokens are not printed in logs or screenshots.
- [ ] No commercial game names, rules, logos, or art appear in assets/video.

## Repository and evidence

- [ ] Clean clone setup works from README.
- [ ] All `bun run validate` checks pass.
- [ ] Production behavior matches README, JUDGING, screenshots, and video.
- [ ] `docs/08-SUBMISSION-EVIDENCE.md` contains exact, current evidence.
- [ ] Previous experimental work is disclosed accurately.
- [ ] Third-party notices and licenses are current.
- [ ] Submission commit and tag are recorded.
