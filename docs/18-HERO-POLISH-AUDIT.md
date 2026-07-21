# Prism Foundry hero-polish audit

Date: **2026-07-21**

Accepted technical baseline: `c4135308128c7b43f18ebeb53ef37083610959f7`

Release state: **AWAITING OWNER PRODUCT APPROVAL**

This is a product-presentation audit of the accepted Prism Foundry and
room-as-program foundation. It is not another product reset and does not grant
M9 approval.

## Production playthrough before editing

The current production build was played in a clean 1440 × 900 browser through
multiple Mara and Ivo turns, live Luna selection, live Designer rule creation,
the Ruby resonance purchase, Program inspection, undo, redo, and a separate
two-browser persistent-room journey.

| Question | Finding before polish |
|---|---|
| Is selecting crystals understandable? | The bank visually explains the choice, but the Pixi stacks are not the primary interaction. The user must discover a six-button HTML matrix below the table. Selection and destination are not staged visually. |
| Is buying a card understandable? | Affordable cards receive a renderer treatment, but purchase still depends on controls below the table. There is no attached cost/payment/discount preview. |
| Are costs and discounts readable? | The information exists, but market card text, ability text, and mat discount values are too small at normal desktop scale. |
| Is Ivo's turn obvious? | The turn marker moves to Ivo, but play pauses until the user finds and presses `Let Ivo move`; the status text leads with model and implementation language. |
| Are Prism and Echo visible? | They are printed on cards, but the small copy makes their meaning easy to miss. Ruby resonance does visibly move a Prism after buying Crimson Relay. |
| Does the Designer rule fire? | Yes. Live Designer added Ruby resonance, the House Rules card changed, and buying Crimson Relay moved payment, the card, Prestige, a Ruby discount, the market refill, and a Prism. |
| Do undo and redo work? | Yes. The selected cell's inverse and retained forward patches restore the expected table, but this is presented as technical status copy on a separate Program page. |
| Can play progress toward 8 Prestige? | Yes. Repeated legal turns append to the same history and the deterministic complete-game test reaches the real 8-Prestige ending. Ordinary play still requires moving between off-table controls and the table. |
| Does sharing work? | Yes. A temporary production room routed both clients to `/room/<id>`, removed the Player capability fragment after storage, converged at Cell 17, reconnected after reload, and forked without changing the parent. Discoverability is poor: the action says `Share room`, and the only Player invite is under Advanced diagnostics. |

## Product and copy findings

- The first screen speaks to an interpreter evaluator rather than a tabletop
  player: `The board game is the program` and reversible-source explanations
  dominate before the user acts.
- The required Program visit delays the understandable tabletop story.
- Technical phrases such as registered options, forward/inverse patches, and
  validated source appear in ordinary play feedback.
- Program, Change rules, and Table feel like separate destinations, so opening
  the implementation removes the physical result from view.
- The large page header, navigation, guide, table frame, action panel, rules
  grid, and diagnostics compete vertically.
- The 800 × 500 Pixi stage leaves material unused desktop width; critical game
  text is compressed inside it.
- Normal `/room/<id>` play inherits judging language instead of behaving like
  an ordinary game.

The tracked baseline captures are:

- [1440 × 900](../evidence/local/prism-foundry-production-1440x900.png)
- [1280 × 800](../evidence/local/prism-foundry-production-1280x800.png)
- [Pixel 7](../evidence/local/prism-foundry-production-pixel7.png)

## Focused redesign plan

1. Lead with player-facing copy and a compact header.
2. Keep the full table visible while Program, Table Agent, Rulebook, and Share
   open as drawers or sheets.
3. Make bank stacks and cards the primary pointer/keyboard interactions, with a
   compact semantic Actions fallback.
4. Let Ivo begin automatically, show thinking on his mat, and retain a recovery
   action.
5. Unify Ivo and Designer messages in one chronological Table Agent while
   keeping their authority labels distinct.
6. Render Program as continuous syntax-highlighted source with selected-cell
   evidence collapsed by default.
7. Make local versus persistent-room state and the Player invite obvious.
8. Preserve the accepted interpreter, patches, AI boundaries, room protocol,
   persistence, and deterministic Prism Foundry rules.

## Local candidate review

The polished candidate was played through the same path in clean local desktop
and mobile contexts. Direct crystal selection, card inspection, automatic Ivo,
Ruby Resonance, Program undo/redo, and two-browser sharing all remained usable.
The implementation also exposed and fixed two real interaction defects:

- the optimistic room acknowledgement cancelled a scheduled automatic Ivo turn
  before it began; automatic-turn deduplication now starts only when the timer
  fires;
- a mobile live-announcement layer could intercept the card Buy control; it no
  longer receives pointer events.

Additional fixes include stable Table Agent message IDs under concurrent React
updates, touch-safe bank targets, readable market costs, and direct Player
invite discovery outside Advanced.

## Local screenshot set

| Required view | Candidate image |
|---|---|
| 1440 × 900, no rule | [hero polish](../evidence/local/hero-polish-1440x900.png) |
| 1280 × 800 | [hero polish](../evidence/local/hero-polish-1280x800.png) |
| Pixel 7 | [hero polish](../evidence/local/hero-polish-pixel7.png) |
| Ruby Resonance active | [rule fired](../evidence/local/hero-polish-ruby-resonance.png) |
| Table Agent open | [agent drawer](../evidence/local/hero-polish-table-agent.png) |
| Program beside table | [program drawer](../evidence/local/hero-polish-program.png) |
| Share with short Room ID | [share drawer](../evidence/local/hero-polish-share-dialog.png) |
| Second-browser Player view | [player role](../evidence/local/hero-polish-player-view.png) |

At 1440 × 900 the five-second review answers are visible without scrolling:

1. **What game is this?** Prism Foundry.
2. **What is the objective?** Reach 8 Prestige first.
3. **Which mat is mine?** Mara's mat is labelled `YOU` and active.
4. **Whose turn is it?** The gold turn marker and active-mat treatment name Mara.
5. **What can I do now?** Take the two highlighted crystals or buy a card.
6. **Where can I ask for a new rule?** The persistent **Change a rule** control.
7. **Where can I inspect the program?** The persistent **Program** control.
8. **How can I invite another player?** **Create shared room**, then Share's Player invite.

## Post-deployment audit

This section will record the same hands-on checks and the required screenshot
set after the polished build is deployed. Automated results will remain
verification evidence, not product approval.
