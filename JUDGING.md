# Judge guide

## Demo

- URL: <https://board-game-computer.sanocks.workers.dev/judge>
- Login: none
- User API key: not required
- Best path: desktop or mobile modern browser

Current production status: M5 is deployed and verified. The deterministic and
validated GPT-5.6 paths below work in production. Guided replay/takeover polish
and shared-room persistence remain later milestone work.

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

## Validated M5 path

1. Press **Ask GPT-5.6 Designer** with the prepared blue-gate request.
2. Watch accepted, budget, and generating progress; confirm the returned source
   appears as a normal Designer cell only after local speculative execution and
   exact rollback.
3. End Mara's turn and press **Ask GPT-5.6 Luna for Ivo move**. Confirm the
   reason is labelled live and the chosen opaque option is revalidated and
   executed through the same action path as a human.
4. If either request is unavailable, confirm the UI explicitly says
   **Labelled deterministic fallback** and play continues.

## Release

- Submission commit: `<commit-sha>`
- Submission tag: `build-week-submission`
- Video: `https://youtu.be/<video-id>`
