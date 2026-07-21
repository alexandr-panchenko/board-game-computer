# Board Game Computer judging guide — Prism Foundry

Release state: **AWAITING OWNER PRODUCT APPROVAL**. This guide validates the replacement product but does not mark M9 complete or create a submission tag.

## Mandatory live path

Use a clean desktop browser at <https://boardgamecomputer.com/judge>. No login or API key is required.

1. Confirm the first screen says **The board game is the program.**, names **Prism Foundry**, states **Objective: First to 8 Prestige wins**, shows **Mara to act**, displays the full physical tabletop, and offers one gold action: **Open the complete program**.
2. Choose **Open the complete program**. Confirm one uninterrupted sequence of 16 cells appears. Cell 1 creates the physical table. Subsequent source visibly creates the bank, mats, markers, 23 finite tokens, original card catalog, six-card market, actions, payment, abilities, refill, turn progression, victory, and setup. Cell 16 begins Mara's turn.
3. Return to **Table**. Choose **Take Ruby + Sapphire**. Confirm Ruby and Sapphire each decrease from 5 to 4 in the bank, two colored tokens appear on Mara's mat, Ivo receives the turn marker, and Program now has Cell 17 containing a canonical `performAction` call.
4. Choose **Let Ivo move**. With live AI enabled, the status names GPT-5.6 Luna and its reason. Luna receives only legal options. If the request is unavailable, the status explicitly names the deterministic legal fallback. Confirm Mara gets the next turn and the action joined Program.
5. Choose **Open Change rules**. Leave the displayed request: “When a player buys a Ruby card, give them one available Prism token.” Choose **Ask GPT-5.6 Designer**.
6. Confirm the status says the candidate became a valid reversible cell and returns to Table. The physical House Rules card now says **Ruby resonance**. In Program, the new Designer cell contains exactly the supported semantic rule:

   ```js
   addHouseRule("Ruby resonance", {
     when: "buy-ruby",
     then: "gain-prism"
   });
   ```

   The candidate was parsed, capability-validated, speculatively executed, inverse-patched to the exact prior hash, and only then committed.
7. Choose **Buy Crimson Relay**. Confirm its two payment tokens return to the bank; the card moves to Mara's tableau; Mara reaches 1 Prestige and 1 Ruby discount; the market refills from the seeded deck; and Ruby resonance moves one Prism from the bank to Mara. The visible status explains what changed, why it was legal, and the next action.
8. Open **Program**. Confirm Cells 1 through the latest cell remain one chronological history—genesis, both player actions, Designer rule, and triggered purchase. Select the latest cell to read its source, trace, mutation count, and before/after hashes.
9. Choose **Undo cell**. Confirm the inverse patch restores the pre-purchase table. Choose **Redo cell** and confirm the retained forward patch restores the purchase without source replay.
10. Continue alternating Take and Buy. The game is fully playable without live AI. A deterministic registered-action path reaches at least 8 Prestige, announces the winner on the tabletop, and closes ordinary legal actions while Program/history/fork remain usable.

## AI-disabled fallback

In an environment with `AI_ENABLED=false`, or when either request is unavailable:

1. Repeat steps 1–3.
2. Choose **Let Ivo move**. Confirm the deterministic fallback commits a legal option and play continues.
3. Open **Change rules** and choose **Ask GPT-5.6 Designer**. Confirm nothing is committed and the status offers the **labelled offline example**.
4. Choose **Use labelled offline example**. Confirm the same locally validated Ruby resonance source commits and appears in Program and House Rules.
5. Buy Crimson Relay and confirm the rule fires. This is explicitly labelled fallback evidence, not a claim of a live model response.

## Shared-room path

1. From a fresh Table choose **Share room** and wait for **connected**.
2. Expand **Advanced diagnostics** and open the Player capability link in a clean second browser context.
3. Commit **Ruby + Sapphire** in the first browser. Confirm both clients show Program 17 and the same table.
4. Reload the second client. Confirm the authoritative tail reconnects at Program 17.
5. In Program, undo to inspect the prior prefix, then choose **Fork from here**. Confirm the child room is created from that prefix and the parent can return forward to its live state.

## Mobile path

Use a Pixel 7-sized clean browser:

- The complete physical table and compact turn/objective state are visible in the first viewport.
- Fixed bottom navigation reaches **Table**, **Program**, and **Change rules** without traversing unrelated diagnostics.
- The complete mandatory path can be performed with touch-safe controls.
- The page has no horizontal document overflow.

## Expected production identity

- URL: <https://boardgamecomputer.com/> and <https://boardgamecomputer.com/judge>
- Deployed commit: recorded in `STATUS.md` after deployment
- Release state: **AWAITING OWNER PRODUCT APPROVAL**
- Final `build-week-submission` tag: intentionally absent
