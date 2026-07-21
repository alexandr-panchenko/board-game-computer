# Judge guide

## Demo

- URL: <https://board-game-computer.sanocks.workers.dev/judge>
- Login: none
- User API key: not required
- Best path: desktop or mobile modern browser

Current production status: the complete M6 path below is deployed and verified
on desktop and minimum mobile viewports. The optional M7 persistent-room proof
is also deployed and verified. Production evidence is recorded in
`docs/08-SUBMISSION-EVIDENCE.md`.

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

## Optional persistent two-browser proof

1. Return to the demo checkpoint and press **Create shared room**.
2. Confirm **Connected · Designer · Seq 0 · Converged**, then open **Open
   Player link** in a second browser context. The secret remains in the URL
   fragment and is removed from the visible address after joining.
3. Perform **Move → azure-gate** in either browser. Confirm both show sequence
   1 and the same game-state hash.
4. Reload one browser and confirm it reconnects at sequence 1 without losing
   the room.
5. Press **Previous cell**, then **Fork from here**. Open the fork and confirm
   it starts at the selected prefix while **Return live** restores the unchanged
   parent.

## Release

- Submission commit: `<commit-sha>`
- Submission tag: `build-week-submission`
- Video: `https://youtu.be/<video-id>`
