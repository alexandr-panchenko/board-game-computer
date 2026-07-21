# Judge guide

## Demo

- URL: <https://board-game-computer.sanocks.workers.dev/judge>
- Login: none
- User API key: not required
- Best path: desktop or mobile modern browser

Current implementation status: M4 is deployed and production-verified. The
deterministic path below works; live GPT-5.6 rule
authoring and shared-room persistence are not yet available.

## Current deterministic path

1. Open `/judge`; confirm **Round 3**, **Mara turn**, **Threat 4 / 10**, seven
   rooms, and the three canonical replay cells.
2. Press **Move → azure-gate**. Confirm Mara moves, AP drops to 1, the trace is
   shown, and the state hash changes.
3. Press **Undo game cell**, then **Redo game cell**. Confirm Mara and the hash
   return exactly each time.
4. Press **Reset**. Confirm the Round 3 checkpoint returns.
5. Press **End turn**, then **Run Ivo fallback turn**. Confirm the labelled
   deterministic fallback performs only registered legal actions.
6. Press **Fresh copy**. Confirm Round 1, Threat 2, and both explorers in the
   Gatehouse.

The automated browser path also plays from the checkpoint to Mara escaping
with two relics and separately proves vault collapse.

## Expected visible outcome

A deterministic program drives direct manipulation, fallback-AI play, exact
undo/redo, reset, and both real endings. Live Designer rule changes arrive in
M5 and are not claimed by this milestone.

## If the AI API is unavailable

Press **Use labelled example rule**. The application inserts a clearly marked
prewritten cell into the same validator and interpreter. This fallback is not
presented as a live GPT-5.6 response.

## Release

- Submission commit: `<commit-sha>`
- Submission tag: `build-week-submission`
- Video: `https://youtu.be/<video-id>`
