# UX and demo flow — Prism Foundry

Status: binding replacement information architecture; **AWAITING OWNER PRODUCT APPROVAL**.

## First viewport

Without scrolling, desktop and mobile must communicate:

- product statement: **The board game is the program.**
- one sentence explaining reversible source cells create every component and move;
- game title: **Prism Foundry**;
- objective: **First to 8 Prestige wins.**
- Mara as active human seat, turn, and both Prestige values;
- the complete physical tabletop;
- one gold next action;
- direct Table, Program, and Change rules navigation.

The tabletop is the dominant surface. Diagnostics, hashes, capability details, and room internals stay collapsed.

## Table surface

The table is a single coherent physical projection with:

- felt/brass perimeter and depth;
- six original illustrated market cards with readable cost, Prestige, discount color, and ability;
- seeded deck and spent area;
- finite faceted token stacks in five distinct colors;
- Mara and Ivo mats containing their owned physical tokens, permanent discounts, purchased cards, and Prestige;
- unmistakable active-turn marker;
- physical Rulebook and House Rules cards;
- winner overlay when the game ends.

Canvas interactions and the HTML accessibility mirror invoke the same registered legal options. Ordinary source IDs never appear in primary copy.

## Program surface

Program behaves like a notebook/REPL, not marketing documentation or a state inspector.

- Exactly one numbered chronological sequence appears: Cell 1, Cell 2, … Cell N.
- Cells 1–16 are the actual executable genesis, not a summary.
- Full creation source is inspectable: table, bank, mats, markers, token catalog, card catalog, market, rules, setup.
- Action and Designer cells append to the same sequence.
- Each selected cell exposes its source, human label, trace, forward-mutation count, inverse retention, and before/after hashes.
- Undo, redo, local prefix inspection, and fork remain available after ordinary play and after victory.
- The empty next cell/caret makes continuation visible.

## Change rules surface

The default request is:

> When a player buys a Ruby card, give them one available Prism token.

The surface explains the safety sequence in human language:

1. GPT-5.6 proposes source.
2. Acorn parses the deliberate subset.
3. The validator enforces capabilities.
4. The browser executes speculatively and applies the inverse patch.
5. Only an exact rollback permits commit.

The labelled offline example is visible and truthful. It is never represented as a live GPT response.

## Guided judging progression

The table-level guide has four product-proof stages, not a sample-specific scripted illusion:

1. **Inspect how the table was created** — opens all 16 genesis cells.
2. **Take control of Mara** — takes Ruby + Sapphire and appends a normal action cell.
3. **Let Ivo choose a legal action** — Luna or fallback chooses an offered option.
4. **Rewrite the live game** — opens Change rules, then directs the viewer to buy a Ruby card and trigger the committed rule.

After every action, visible status answers:

- what physical components moved;
- why the option was legal;
- which counters/discounts/Prestige changed;
- whether an ability or House Rule fired;
- what to do next.

## Full-game learning

`How to play Prism Foundry` is available from the first screen and does not block the judge path. It explains:

- first to 8 Prestige;
- one action per turn;
- take two different ordinary colors;
- buy from the market;
- discounts and wild Prism payment;
- Prism and Echo abilities;
- turn passing and victory.

The current legal controls name useful actions directly. Affordable cards glow on canvas and appear as accessible Buy controls. A user needs no repository documentation to finish.

## Mobile information architecture

Mobile is table-first, not stacked desktop columns.

- Compact product statement, objective, active turn, guide, and the complete scaled table appear in the first viewport.
- Fixed bottom tabs open Table, Program, and Change rules directly.
- Legal actions form touch-safe horizontal control rows.
- Program source scrolls within cells without creating horizontal document overflow.
- Change rules is a dedicated surface, not content below a long table page.
- Diagnostics remain collapsed and out of the primary route.
- Canvas uses tap selection; it does not claim unsupported drag behavior and does not fight page scrolling.

## Responsive targets

Manual visual review and screenshots are required at:

- 1440 × 900;
- 1280 × 800;
- Pixel 7 or equivalent.

At each target the viewer must identify the product, goal, next action, AI rule-changing surface, and Mara within five seconds.

## Demo timeline

| Time | Visible proof |
|---:|---|
| 0–12 s | Product claim, objective, full physical table, Mara, next action |
| 12–28 s | Program Cells 1–16 visibly create the whole room |
| 28–40 s | Mara takes two finite bank tokens; Cell 17 appends |
| 40–52 s | Luna chooses one legal option or labelled fallback does |
| 52–72 s | Designer candidate validates, reverses, commits, and appears on House Rules |
| 72–88 s | Crimson Relay purchase fires Ruby resonance visibly |
| 88–105 s | Program shows one complete history; inverse and forward patches undo/redo |
| 105–120 s | Share/reconnect/fork evidence and continued path to 8 Prestige |

## Accessibility and honesty

- Keyboard focus has a visible 3 px outline.
- Interactive targets are at least 40 px desktop and 44 px mobile.
- A single live status announcement follows actions across surfaces.
- Canvas has a meaningful accessibility label; HTML mirrors legal actions without becoming canonical state.
- Color is reinforced by names, card text, token geometry, player names, and mat labels.
- No internal slug appears in primary legal-action copy.
- No automated pass is presented as proof that a human understands the interface.
