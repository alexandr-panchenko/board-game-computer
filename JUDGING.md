# Judge guide

## Demo

- URL: <https://boardgamecomputer.com/judge>
- Login: none
- User API key: not required
- Best path: desktop or mobile modern browser

Current production status: the human-UX-corrected path below is deployed at the
exact recorded commit. Desktop/mobile and rollback verification are recorded in
`docs/08-SUBMISSION-EVIDENCE.md`.

## Literal 60–90 second path

1. Open `/judge`; confirm **A board game that rewrites itself.**, the complete
   objective, **Round 3**, active player **Mara**, **Threat 4 / 10**, the seven
   rooms, and **Watch the program run · 0 / 3**. No AI request runs on load.
2. Press the gold **Next step** action three times. After each step, open
   **Program** to confirm the current reversible cell and its readable trace,
   then return to **Play**. The highlighted room and table state advance with
   the same cell.
3. Press **Take control**, then **Move Mara to Azure Gate**. Confirm the result
   explains why matching doors made the move legal and that Ivo is next.
4. Press **Let Ivo move**. Confirm GPT-5.6 Luna selects only from offered legal
   actions and the interface opens **Change rules**. If the live path is not
   available, press **Use deterministic Ivo fallback**.
5. Leave the prepared request unchanged and press the gold **Change the rules**
   action. Confirm validation progress is visible. If the request fails, press
   **Try the example rule**; it uses the same local validation path.
6. On **Play**, press **Move Mara to Clockwork Archive**, then **Move Mara to
   Azure Gate**. Confirm Mirror Gallery visibly rotates, the source-to-room
   highlight appears, and the coach reads **Hero path complete**.
7. Press **Keep playing** to continue toward an ending. Also verify **Return to
   demo checkpoint**, **Replay from start**, and the header's **New game**
   produce their labelled states.

The automated suite additionally reaches Mara's real escape ending and the
vault-collapse ending, and completes this hero path with both mocked AI and no
OpenAI availability.

## Expected visible outcome

A deterministic program drives replay, direct manipulation, legal AI play,
validated live rule editing, exact undo/redo, reset, and both real endings.

## If the AI API is unavailable

Press **Try the example rule**. The application inserts a clearly marked
prewritten cell into the same validator and interpreter. This fallback is not
presented as a live GPT-5.6 response.

## Optional persistent two-browser proof

1. Open **Change rules**, expand **Share this room**, and press **Create shared
   room**.
2. Confirm **Connected · Designer · Seq 0 · Converged**, then open **Open
   Player link** in a second browser context. The secret remains in the URL
   fragment and is removed from the visible address after joining.
3. Open **Play**, expand **All legal moves**, and perform **Move Mara to Azure
   Gate** in either browser. Return to **Change rules → Share this room** and
   confirm both show sequence 1. The matching game-state hash remains available
   under **Program → Advanced diagnostics**.
4. Reload one browser and confirm it reconnects at sequence 1 without losing
   the room.
5. In **Share this room**, press **Previous cell**, then **Fork from here**.
   Open the fork and confirm it starts at the selected prefix while **Return
   live** restores the unchanged parent.

## Release

- Submission commit: `<commit-sha>`
- Submission tag: `build-week-submission`
- Video: `https://youtu.be/<video-id>`
