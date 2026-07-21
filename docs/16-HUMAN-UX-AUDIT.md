# Human UX audit and correction plan

> **Historical rejected baseline only.** The owner rejected the product audited
> here at commit `6fe6e435858a7d397636aaef4ebba3872b29a880`. Its screenshots and
> green checks demonstrate what was tested, not approval. The sole current
> production sample and acceptance gate are defined by D-057 and
> `docs/17-PRODUCT-RESET.md`.

**Audit date:** 2026-07-21  
**Production build inspected:** `de9b44f16b84d7a7bc8697bcebeeb40cf6214778`  
**Routes:** `https://boardgamecomputer.com/` and
`https://boardgamecomputer.com/judge`  
**Viewports:** 1440 × 900, 1280 × 800, and Pixel 7 equivalent (412 × 915)

This is a human-comprehension audit, not a test-status report. Passing automated
checks does not prove that a first-time visitor understands the product or can
find the intended action.

## What is implemented

Board Game Computer is a shared digital tabletop whose game state is an ordered
program. A player action becomes a small JavaScript-shaped source cell. The
browser parses and validates that source with a restricted interpreter, applies
it atomically, and records forward and inverse patches so the change can be
undone, redone, rolled back, or rebased. The same mechanism accepts a narrowly
bounded rule proposed by GPT-5.6 after local validation and speculative rollback.

The current application includes:

- a deterministic guided replay and takeover path;
- the complete Shifting Vaults game, including both win and collapse endings;
- Mara as the human-controlled explorer and Ivo as an AI/fallback-controlled
  explorer;
- GPT-5.6 Luna selection from offered legal actions, with a deterministic
  fallback;
- GPT-5.6 Designer rule generation, repair, local validation, speculative
  execution, rollback, and commit, with a labelled deterministic example;
- a PixiJS top-down board backed by renderer-independent game geometry;
- reversible game and language cells;
- persistent Durable Object rooms, capability links, optimistic actions,
  reconnect, timeline inspection, convergence, and forking;
- a login-free `/judge` route and a fresh deterministic game path.

These capabilities exist, but the current screen presents them as an engineering
console instead of a legible product journey.

## What Shifting Vaults is

Shifting Vaults is a cooperative two-explorer race through seven connected
rooms. Mara and Ivo each start a turn with 2 action points. A move or search
costs 1 AP; room rotation can change which doors connect. Six hidden room tokens
contain four relics and two hazards. Searching a relic adds it to that explorer;
searching a hazard raises Threat. One tactic card may be played per turn: Sprint
moves without AP, Gear rotates a neighboring empty room, Survey reveals a token,
and Ward lowers Threat. After Ivo ends a turn, the round advances and Threat
rises by one. An explorer wins by collecting 2 relics and returning to the
Gatehouse. Everyone loses if Threat reaches 10 first.

## Current judge-path instructions

These are the exact steps required by the interface as it existed at audit time.
Several controls require scrolling, particularly at 1280 × 800 and mobile.

1. Open `/judge`.
2. Find the bottom action bar and press `Next replay step` three times. The left
   Script & Replay column highlights the corresponding cell, while the right
   panel shows its trace.
3. Press `Take control now`.
4. In Legal actions, press the raw-labelled `Move → azure-gate` button (or begin
   the board drag gesture on Mara and release over Azure Gate). The app also
   ends Mara's turn automatically for this guided step.
5. Scroll to the AI controls and press `Ask GPT-5.6 Luna for Ivo move`. If the
   live request is unavailable, press `Run Ivo fallback turn`.
6. Scroll below the Persistent room section to GPT-5.6 Designer. Press
   `Ask GPT-5.6 Designer`. If unavailable, press `Use labelled example rule`.
7. Return to Legal actions and press `Move → clockwork-archive`.
8. Press `Move → azure-gate`. The new Scenario rotates Mirror Gallery.
9. Confirm that the coach reads `Hero path complete` and the status reports that
   the blue-gate Scenario fired.

## Current full-game instructions

1. Press `Fresh copy` to start at round 1 with both explorers in Gatehouse,
   Threat 2, 2 AP for Mara, and hidden tokens in all six non-start rooms.
2. On Mara's turn, choose from the Legal actions list. Move only through room
   edges whose doors currently face each other. A normal move costs 1 AP.
3. Use `Rotate room` on an adjacent, unoccupied, non-Gatehouse room for 1 AP to
   open or close routes.
4. Use `Search` in Mara's current unsearched room for 1 AP. A relic increases
   Mara's relic count; a hazard increases Threat by 1.
5. Optionally play one tactic card per turn. Sprint moves without AP, Gear
   rotates, Survey reveals an adjacent token, and Ward reduces Threat.
6. Press `End turn` when Mara is finished.
7. On Ivo's turn, press `Ask GPT-5.6 Luna for Ivo move`, or use
   `Run Ivo fallback turn`; the fallback repeatedly makes legal actions and ends
   Ivo's turn.
8. Continue alternating turns. Each completed Ivo turn starts a new round and
   raises Threat by 1.
9. Win by getting either explorer to 2 relics and moving that explorer back to
   Gatehouse. If Threat reaches 10 first, the vault collapses.

The fresh-game screen does not currently explain most of these rules, card
effects, or the meaning of the board tokens.

## Visible-control inventory before correction

At the initial checkpoint the accessibility tree exposes 20 buttons:

- game actions: `End turn`, three raw-ID Move actions, six raw-ID tactic
  actions, and two raw-ID Rotate actions;
- history: `Undo game cell` and `Redo game cell`;
- room infrastructure: `Create shared room`;
- Designer: `Ask GPT-5.6 Designer` and `Use labelled example rule`;
- journey/reset: `Next replay step`, `Take control now`, and `Fresh copy`.

Additional controls appear conditionally: Luna request/cancel/fallback, Designer
cancel/retry, Player/fork links, previous/next/return-live/fork timeline buttons,
and the language lab's Run/Undo/Redo controls. The board canvas accepts a drag
gesture, but the piece does not follow the pointer. The Reversible language lab
is collapsed, while Script & Replay, the full legal-action inventory, game hash,
persistent-room controls, and Designer are all expanded.

## Usability problems

### P0 — blocks first-time comprehension or the mandatory journey

- The required product statement is absent. A visitor sees `Board Game
  Computer` and `Shifting Vaults` without a direct explanation of either.
- The objective is a low-contrast sentence below the board, not a first-load
  anchor. It says `recover` rather than the specified, scannable objective.
- The single intended next action is not visible in the initial viewport. The
  fixed-looking workspace consumes the screen, while the action bar occurs
  after the document content.
- At 1440 × 900 the document is 1,531 px tall; at 1280 × 800 it is 1,584 px.
  At Pixel 7 size it is 2,394 px and simply stacks the desktop columns.
- Mobile visitors must scroll past the board and the entire dense source list
  before reaching the progress coach, legal actions, Luna, or Designer.
- Twenty actions are exposed at once. The judge-path recommendation competes
  with general moves, cards, rotation, history, sharing, AI, and reset controls.
- Normal UI copy exposes implementation slugs (`azure-gate`,
  `clockwork-archive`, `gear-2`) and does not translate them into a player's
  vocabulary.
- The canvas uses a grab cursor and drag start, but the piece does not visibly
  follow the pointer. The interaction therefore appears broken even when the
  release commits a valid move.
- After a commit, status text describes a reversible cell and trace labels, but
  does not consistently state what changed visually, why it was legal, and the
  exact next step.

### P1 — materially weakens playability or visual appeal

- The board is not visually dominant: dense sidebars take roughly one third of
  the desktop width and the board shares attention with raw source and controls.
- Rooms are nearly identical dark rectangles. Azure Gate is differentiated
  mostly by a blue border; its special role is not unmistakable.
- Unsearched tokens are identical question marks; revealed relic/hazard state
  is not represented as a meaningful tabletop component.
- Mara and Ivo are plain colored circles with no initials, silhouettes, or
  portrait identity. Color is the only immediate distinction, and the active
  explorer has no halo.
- AP, relics, cards, turn, and Threat are represented mainly as prose or pills,
  not as game components with clear relationships.
- Legal destinations receive a border only after pointer-down, with no stable
  explanation or selection state.
- The source program is presented in 10 px type and shows three dense blocks at
  once. The current cell/trace relationship is split across opposite sidebars.
- The game hash is visible in the primary inspector, while the human-readable
  outcome/history information is visually weak.
- Persistent-room infrastructure appears before the primary GPT Designer
  capability.
- Undo/redo appears both for game history and inside the language lab without a
  hierarchy that distinguishes them.
- There is no compact `How to play` surface on the first screen.
- Side panels are fixed open; progressive disclosure is limited to the language
  lab alone.
- Room rotation changes its degree label and doors immediately, but lacks a
  room-specific rotation animation or a strong visual link from committed cell
  to changed room.
- Undefined CSS variables `--line` and `--accent` are used by room-sharing
  styles, producing inconsistent borders and link/status color.

### P2 — polish and confidence problems

- Typography, spacing, border treatments, and accent colors do not form a
  deliberate tabletop visual system.
- The board background is flat and empty; it lacks depth, path emphasis, and
  component shadows expected of a finished game.
- Door markers are readable only after studying the geometry and do not clearly
  communicate matching connections.
- The hand is a comma-separated sentence, not a set of recognizable cards.
- Developer phrases such as `canonical source`, `opaque offered option IDs`,
  sequence numbers, and state attestations dominate normal play copy.
- The first-load replay coach title describes implementation causality rather
  than the visitor's task.
- The `/` and `/judge` routes are visually indistinguishable except for a small
  technical footer status.

## Discrepancies from `docs/02-UX-AND-DEMO-FLOW.md`

- The document specifies a beautiful tabletop as the primary visual surface;
  the implementation gives equal structural weight to Script and Inspector.
- It specifies collapsible side panels; both desktop side panels are fixed open.
- It specifies one primary action with secondary actions grouped quietly; the
  implementation expands the entire legal-action set and multiple platform
  tools.
- It specifies event-log language that explains causality; the implementation
  puts terse traces in one sidebar and technical commit status in another.
- It specifies full-width table-first mobile with bottom navigation and bottom
  sheets; the implementation vertically stacks board, Script, and Inspector.
- It specifies persistent mobile action reachability; the journey action is
  after a 2,394 px document rather than sticky near the board.
- It specifies a readable Script surface tied to the selected cell; all initial
  cells are shown in 10 px source text while the trace is elsewhere.
- It specifies onboarding that introduces visual causality before architecture;
  the implementation exposes hashes, room infrastructure, source, and runtime
  terminology on first load.
- It specifies visible pending/rebase state for multiplayer; those diagnostics
  exist, but their placement overwhelms the solo product journey before a room
  is created.

## Before screenshots

The screenshots are viewport captures of the untouched deployed application,
after Pixi initialization and with no interaction.

| 1440 × 900 | 1280 × 800 |
| --- | --- |
| ![Before at 1440 by 900](../evidence/local/ux-before-1440x900.png) | ![Before at 1280 by 800](../evidence/local/ux-before-1280x800.png) |

| Pixel 7 equivalent — 412 × 915 |
| --- |
| ![Before on Pixel 7](../evidence/local/ux-before-pixel7.png) |

The local evidence directory is intentionally gitignored. Curated after captures
and concrete comparison notes will be added below after implementation.

## Concise redesign plan

1. Establish the first-screen story: product statement, one-sentence explanation,
   game title, exact objective, compact game HUD, dominant board, persistent
   six-stage progress, and one sticky primary action.
2. Replace the three-column console with product surfaces: Play, Change rules,
   Program, and a collapsed Advanced area. Keep only the context needed for the
   current stage visible.
3. Make the coach explain what happened, why it was legal, what changed, and what
   comes next. Translate all IDs and card copies into human-readable labels.
4. Redraw the Pixi tabletop as a coherent vault: distinctive rooms and pieces,
   door links, token states, active-player halo, legal-target emphasis, visible
   selection/drag feedback, and room-change animation.
5. Add an always-reachable, non-blocking How to play surface and visual card,
   relic, hazard, AP, Threat, and turn indicators.
6. Implement table-first mobile tabs with a sticky primary CTA and compact
   panels, so Play, Change rules, and Program are each one tap away without
   document-length scrolling.
7. Preserve advanced diagnostics, sharing, timeline, undo/redo, and the language
   lab behind explicit disclosure; then expand E2E coverage around comprehension,
   primary-action uniqueness, mobile navigation, focus, and slug hygiene.

## Explicit non-goals

- No changes to interpreter semantics, transactional patches, framework rules,
  deterministic state, room protocol, rebase/reconnect/fork behavior, or AI
  validation boundaries.
- No changes to Shifting Vaults win/loss rules, AP economy, seeded setup, tactics,
  or the deterministic guided checkpoint.
- No second game, account system, marketplace, runtime image generation, 3D,
  physics, secrecy, or other platform expansion.
- No unreviewed third-party art or external asset dependency.
- No final M9 completion, submission tag, or owner-only eligibility/session/video/
  Devpost work in this pass.

## Before/after comparison

The after captures use the same routes, state, viewport dimensions, and
post-Pixi wait as the before captures.

| Viewport | Before | After |
| --- | --- | --- |
| 1440 × 900 | ![Desktop before](../evidence/local/ux-before-1440x900.png) | ![Desktop after](../evidence/local/ux-after-1440x900.png) |
| 1280 × 800 | ![Compact desktop before](../evidence/local/ux-before-1280x800.png) | ![Compact desktop after](../evidence/local/ux-after-1280x800.png) |
| Pixel 7 — 412 × 915 | ![Mobile before](../evidence/local/ux-before-pixel7.png) | ![Mobile after](../evidence/local/ux-after-pixel7.png) |

Concrete differences:

- Before, the statement did not exist; after, `A board game that rewrites
  itself.` and its one-sentence explanation are the first content.
- Before, the objective was low-contrast prose below the board; after, the exact
  objective is directly under the game title.
- Before, 20 buttons competed on load and the journey action was outside the
  initial viewport; after, one gold primary action remains fixed and the full
  legal set is collapsed.
- Before, desktop split attention evenly among two fixed consoles and the
  board; after, the board occupies the large primary surface and the coach uses
  progressive disclosure.
- Before, Pixel 7 stacked a 2,394 px desktop document; after, Play, Change
  rules, and Program are fixed bottom tabs and the primary action remains above
  them. The board, statement, objective, HUD, and next action all appear in the
  initial 412 × 915 capture.
- Before, the tabletop used nearly identical rectangles, colored dots, and raw
  question marks; after, room palettes, door paths, state tokens, Azure Gate
  iconography, Mara/Ivo silhouettes and initials, active halo, AP/relic chips,
  source-room focus, and rotation tweening form a coherent game surface.
- Before, normal action copy exposed internal slugs; after, normal play uses
  names such as `Move Mara to Azure Gate` while source IDs remain only in the
  deliberately technical Program surface.

## Five-second first-impression review after correction

This is an internal manual review, not a claim of independent user research.
At all three required viewports, the initial screen now answers:

1. **What is this?** A board game that rewrites itself; the supporting sentence
   says play and AI rule proposals are validated, committed, and undoable.
2. **What is the goal?** Find 2 relics and return to Gatehouse before Threat 10.
3. **What should I do next?** The only gold journey action says `Next step` and
   its hint says it runs the next reversible cell.
4. **Where is the AI rule-changing capability?** `Change rules` is a first-level
   desktop tab and a persistent mobile bottom tab.
5. **Which character is mine?** The HUD names Mara as active; the board and
   legend show a gold circular `M`, while Ivo is a mint hexagonal `I`.

No answer requires scrolling or opening Advanced. The manual review therefore
passes the specified comprehension test. External human judgment of taste,
physical-device feel, and narrated-demo pacing still remains appropriate.

## Production verification after correction

The corrected build was deployed from exact commit
`f2d71300ebc1c0e21f9a7215551c03d9674fd079` by passing GitHub Actions run
`29830796839`. Clean Chromium checks of `/` and `/judge` passed at 1440 × 900
and Pixel 7 with the statement, objective, board, and primary action inside the
first viewport and no console errors.

| Production desktop | Production mobile |
| --- | --- |
| ![Corrected production desktop](../evidence/local/ux-production-desktop.png) | ![Corrected production mobile](../evidence/local/ux-production-mobile.png) |

The live production judge path completed with HTTP 200 from Luna and Designer;
the returned rule validated, committed, visibly fired, and left the game
playable. The independent labelled fallback completed the same path without an
AI request. Both checks recorded zero console-breaking errors.

| Live GPT-5.6 path complete | Labelled fallback complete |
| --- | --- |
| ![Live path complete](../evidence/local/ux-production-live-complete.png) | ![Fallback path complete](../evidence/local/ux-production-fallback-complete.png) |

These captures are local, gitignored evidence and contain no credentials or
room capability links. M9, the release tag, and owner-only submission artifacts
remain explicitly out of scope for this correction.
