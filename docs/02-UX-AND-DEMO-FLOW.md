# UX and demo flow

## Experience principles

1. **Value before prompting.** The first screen is already a beautiful working
   game. No blank canvas and no setup form.
2. **Show causality.** Every guided step links source, execution trace, and
   table change.
3. **Transition from proof to freedom.** Guided replay ends with **Take
   control**, not a canned finale.
4. **Keep one mental model.** Chat, REPL, direct manipulation, AI actions, and
   replay all create or inspect room cells.
5. **Do not block the first impression.** Use inline coach marks, not a modal
   tour.
6. **Make state legible.** The table is primary, but turn, threat, objectives,
   legal actions, and winner state also exist in HTML.
7. **Be honest about AI.** Show progress and validation, but never raw chain of
   thought or an unlabeled static response.

## Primary information architecture

### Desktop

```text
┌────────────────────────────────────────────────────────────────────┐
│ Board Game Computer · room title · turn/seat · share · reset               │
├───────────────┬───────────────────────────────────┬────────────────┤
│ Script/Replay │                                   │ Chat/Inspector │
│ cells         │          Pixi tabletop            │ agent messages │
│ trace         │                                   │ legal actions  │
│ timeline      │                                   │ objectives     │
├───────────────┴───────────────────────────────────┴────────────────┤
│ contextual action bar / replay next / take control                │
└────────────────────────────────────────────────────────────────────┘
```

The table receives the most space. Side panels are collapsible. Script and
trace highlight the cell currently being replayed or executed.

### Mobile

- full-width table is the default surface;
- bottom navigation switches between `Play`, `Chat`, `Script`, and `Replay`;
- panels open as resizable bottom sheets;
- the current turn, objective, and threat remain visible in a compact header;
- tap selects; drag moves; pinch/pan control the viewport; long press opens
  actions when appropriate;
- browser page scrolling must not fight table gestures;
- the full judge path remains possible without desktop-only hover behavior.

## First-load behavior

Both `/` and `/judge` resolve to an immutable demo template.

1. Static shell and primitive fallback art render immediately.
2. Bundled template cells load and execute locally.
3. The table opens at the configured guided checkpoint, not at an empty setup.
4. A subtle callout says: **“This table is a running program. Advance a cell to
   see exactly what changes.”**
5. The primary button is **Next replay step**.
6. A secondary **Take control now** option is available for impatient users.

The page must not make an OpenAI request during first paint.

## Guided replay sequence

The exact sequence is stored with the sample fixture and remains deterministic.

### Step 1 — action cell

- Highlight a player action cell in Script.
- Animate an explorer moving into a connected room.
- Trace displays action validation and movement mutations.
- Objective/turn HTML updates.

### Step 2 — card and trigger

- Highlight a tactic-card action.
- Rotate or reveal a room.
- Show a nested trace: card resolved → room state changed → legal paths updated.

### Step 3 — AI player

- Show a short historical chat line or decision label.
- Highlight the AI player's registered action cell.
- Execute it exactly like a human action.

### Takeover

- Guided controls transform into live controls.
- The current prefix is forked into a fresh personal room only when the user
  performs the first persistent action; until then, replay is local.
- Highlight one or more legal actions so the user cannot get stuck.

## Live play interaction

### Registered actions

A player sees:

- contextual buttons;
- highlighted destination zones;
- playable cards;
- draggable entities when drag maps to a legal action;
- a compact textual action list for automation and keyboard access.

Unavailable actions are hidden by default. An optional inspector may explain
why a selected action is unavailable, but this is not required for the hero
path.

### Drag/drop

- pointer movement is local and ephemeral;
- geometry determines candidate zones;
- valid targets highlight before drop;
- releasing creates one canonical `performAction(...)` cell;
- remote preview is optional and does not enter the room log;
- rejected speculative actions animate back and show a concise reason.

### Script/REPL

Designer mode exposes:

- source cells with syntax highlighting;
- one editor for a new cell;
- Run command;
- source-located parser/runtime diagnostics;
- execution trace;
- copy/export room script.

Player mode keeps Script read-only or collapsed and emphasizes legal actions.
No role-based secrecy is promised in the cooperative Build Week model.

## Designer-agent flow

The chat composer accepts free text. Include prepared prompt chips for the judge
path without restricting arbitrary input.

### Visible progress

Use short stage labels:

1. **Understanding the room**
2. **Writing a command**
3. **Checking language and permissions**
4. **Running the command safely**
5. **Committing cell**

Do not show token streams as source until the complete function result is
received and parsed. Streaming may update the prose status and final source
panel.

### Validation behavior

- invalid candidate source is not inserted into the visible committed log;
- structured diagnostics are sent back to the model;
- up to three attempts are allowed;
- once valid, the cell commits automatically—there is no separate
  Generate/Preview/Apply wizard;
- the committed cell is highlighted and its short model-provided summary is
  shown in Chat;
- if all attempts fail, show a concise error and leave the room unchanged.

### Prepared hero request

> Whenever an explorer enters a blue gate, rotate the connected room clockwise.

Expected result:

- new Scenario cell appears;
- entering a blue-gate room fires the Scenario;
- connected room rotates 90 degrees;
- geometry and legal connections update;
- trace shows the full deterministic cascade;
- play continues.

## AI-player flow

1. Client computes and materializes legal action choices.
2. Server sends only the structured state summary and legal choices to
   `gpt-5.6-luna`.
3. Model chooses an action through a strict function tool.
4. Client revalidates the choice against current state.
5. The same action executor used by a human creates the cell.
6. UI shows one short reason summary, not hidden reasoning.

On timeout/failure, the deterministic policy chooses a legal action and labels
it **Fallback AI move**.

## Replay and time travel

### Timeline

- every committed cell has a sequence number, author, kind, and concise label;
- chat cells and executable cells share one chronological timeline;
- nested trigger effects appear in trace, not as separately interruptible
  cells;
- dragging the timeline or pressing previous/next applies inverse/forward
  patches locally;
- the live room is unchanged while the user only inspects history.

### Fork from here

When viewing the past:

- **Return live** redoes forward patches to the current head;
- **Fork from here** creates a new persistent room from the selected prefix;
- submitting a persistent action from the past implicitly asks to create that
  fork;
- the original room remains append-only.

## Sharing and permissions

- Designer and Player capability links are separate.
- Capability tokens live in URL fragments where practical and are exchanged
  during connection setup; do not log them.
- A Player link selects or claims an allowed seat.
- No account or password is required.
- The UI assumes cooperative play; network-savvy users could inspect the full
  room log.

## Reset and reproducibility

Visible controls:

- **Return to demo checkpoint** — restore the guided local checkpoint;
- **Fresh copy** — create a clean room from the immutable template;
- **Replay from start** — apply timeline patches back to genesis and advance;
- **Fork from here** — persist a historical branch.

The judge route must never point all visitors at the same mutable room.

## Empty, loading, and error states

### Room loading

Show table skeleton plus: **Loading room program…**. If reconnecting, show the
last confirmed table and a non-blocking reconnect indicator.

### Parser or runtime error from human REPL

- keep source in editor;
- underline exact source span;
- show error code, message, and allowed alternative;
- do not create a committed cell;
- state hash remains unchanged.

### Model failure

- preserve the room;
- expose Retry and labelled example-rule fallback;
- keep direct play and REPL available;
- never clear the table or block navigation.

### Rebase conflict

- rollback pending patches;
- apply authoritative cells;
- re-execute pending cells;
- if a pending cell is no longer valid, remove it from pending and show:
  **“Your action no longer applies after another room change.”**
- AI-authored conflicts may enter repair; human actions require a new choice.

### Divergent state hash

- stop optimistic actions;
- request the authoritative source prefix/tail;
- rebuild from genesis in MVP (or from a verified serialized checkpoint only
  if that later optimization has its own tests);
- display a small recovery message;
- record diagnostic metadata without secrets.

## Visual system

- top-down, board-game-like composition;
- strong silhouettes, readable rooms, cards, tokens, and connection markers;
- restrained animations under roughly 300 ms for ordinary moves;
- no long cinematic transitions;
- static AI-generated art may replace primitives only after the deterministic
  fallback is complete;
- no in-app audio in the Build Week scope;
- no commercial game visual references in the shipped product.

## Accessibility baseline

Full non-visual game parity is not claimed. Required baseline:

- semantic HTML buttons, inputs, tabs, status, and action list;
- visible focus states;
- labels for turn, objective, threat, selected entity, and actions;
- keyboard operation of non-spatial judge controls;
- text Script/Trace representation of key state changes;
- canvas has a useful accessible name and nearby summary;
- minimum touch target sizes appropriate for mobile.

## 90-second judge timeline

| Time | Action | Evidence shown |
|---:|---|---|
| 0–10 s | Open in-progress table | Complete product, no blank prompt |
| 10–28 s | Advance three replay cells | Program-to-table causality |
| 28–38 s | Take control and move | Direct legal interaction |
| 38–48 s | AI player acts | Same action system for agent |
| 48–72 s | Submit prepared Designer request | GPT-5.6 writes validated logic |
| 72–86 s | Move through blue gate | New rule executes visibly |
| 86–90 s | Show trace and fresh-copy control | Determinism and reproducibility |

## Video-first considerations

The first 20 seconds of the final video should show the live table and replay,
not architecture slides. Architecture, Codex workflow, and GPT-5.6 boundaries
can be explained after the visible hero change.
