# Judge guide

## Demo

- URL: <https://board-game-computer.sanocks.workers.dev/judge>
- Login: none
- User API key: not required
- Best path: desktop or mobile modern browser

Current release-candidate status: the complete M6 path below passes locally on
desktop and minimum mobile viewports. Production verification is recorded in
`docs/08-SUBMISSION-EVIDENCE.md`; persistent shared rooms remain M7 work.

## Literal 60–90 second path

1. Open `/judge`; confirm **Round 3**, **Mara turn**, **Threat 4 / 10**, seven
   rooms, and **Guided replay · 0 / 3**. No AI request runs on first load.
2. Press **Next replay step** three times. At each step confirm the highlighted
   canonical source, ordered trace, and visible table state advance together.
3. Press **Take control now**, then the highlighted **Move → azure-gate**.
   Confirm Mara's registered action commits and play passes to Ivo.
4. Press **Ask GPT-5.6 Luna for Ivo move**. Confirm a live or explicitly
   labelled fallback legal action commits and the coach advances to Live design.
5. Leave the prepared prompt unchanged and press **Ask GPT-5.6 Designer**.
   Confirm progress is visible and the validated blue-gate Scenario appears as
   a normal source cell. If unavailable, press **Use labelled example rule**.
6. Press the highlighted **Move → clockwork-archive**, then **Move → azure-gate**.
   Confirm the trace reports entity entry, Scenario match, and linked-room
   rotation. The coach now reads **Hero path complete**.
7. Continue playing toward a real ending, or verify **Return to demo
   checkpoint**, **Replay from start**, and **Fresh copy** reproduce their
   labelled states.

The automated suite additionally reaches Mara's real escape ending and the
vault-collapse ending, and completes this hero path with both mocked AI and no
OpenAI availability.

## Expected visible outcome

A deterministic program drives replay, direct manipulation, legal AI play,
validated live rule editing, exact undo/redo, reset, and both real endings.

## If the AI API is unavailable

Press **Use labelled example rule**. The application inserts a clearly marked
prewritten cell into the same validator and interpreter. This fallback is not
presented as a live GPT-5.6 response.

## Release

- Submission commit: `<commit-sha>`
- Submission tag: `build-week-submission`
- Video: `https://youtu.be/<video-id>`
