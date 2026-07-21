# Judge guide

## Demo

- URL: `https://<production-host>/judge`
- Login: none
- User API key: not required
- Best path: desktop or mobile modern browser

## Steps

1. Press **Next replay step** three times. Confirm that the highlighted source cell,
   execution trace, and tabletop change match.
2. Press **Take control**, then perform one highlighted legal action.
3. Press **AI turn** and confirm that the AI chooses and performs a legal
   registered action.
4. Use the prepared Designer prompt: **“Whenever an explorer enters a blue
   gate, rotate the connected room clockwise.”**
5. Wait for the committed source cell, then move through a blue gate and
   confirm that the connected room rotates and the trace reports the trigger.
6. Continue or press **Return to demo checkpoint** to reproduce the path.

## Expected visible outcome

A single shared program drives replay, direct manipulation, AI play, and live
rule changes. The game remains deterministic and playable after the new rule.

## If the AI API is unavailable

Press **Use labelled example rule**. The application inserts a clearly marked
prewritten cell into the same validator and interpreter. This fallback is not
presented as a live GPT-5.6 response.

## Release

- Submission commit: `<commit-sha>`
- Submission tag: `build-week-submission`
- Video: `https://youtu.be/<video-id>`
