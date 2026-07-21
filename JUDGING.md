# Board Game Computer judging guide — Prism Foundry

Release state: **AWAITING OWNER PRODUCT APPROVAL**. This guide verifies the polished replacement experience; it does not complete M9 or create a submission tag.

## 60–75 second hero path

Open <https://boardgamecomputer.com/judge> in a clean desktop browser. No login or API key is required.

1. Confirm the first viewport says **Play the game. Rewrite the rules.**, names **Prism Foundry**, states **Be the first player to reach 8 Prestige**, and shows Mara's mat, Ivo's mat, the crystal bank, six-card market, and Mara's turn marker.
2. On the tabletop, select the highlighted **Ruby** stack and then **Sapphire**. Confirm both stacks show a selected state, then choose **Take Ruby + Sapphire**.
3. Watch both tokens move to Mara's mat. Ivo's mat becomes active and says **Ivo is choosing a move…**. Ivo then plays automatically. The Table Agent records the move under **Ivo · Player** with a short reason.
4. Choose the dominant **Change a rule** action. The tabletop remains visible while the Table Agent drawer opens.
5. Keep the prepared request, **When a player buys a Ruby card, give them one available Prism token**, and choose **Ask the Designer**. The visible progress reads **Writing the rule…**, **Checking it…**, and **Adding it to the game…**.
6. Confirm the Table Agent records **Ruby Resonance is now part of this game** under **Designer · Rules**, and the physical House Rules card on the table shows the new rule.
7. Close the drawer and select highlighted **Crimson Relay**. Inspect its cost, Mara's crystals, discounts, final payment, Prestige, and ability, then choose **Buy**.
8. Watch payment return to the bank, the card move to Mara's tableau, Prestige and Ruby discount increase, the market refill, and one Prism move to Mara because Ruby Resonance fired.
9. Choose **View source** from the appended-cell confirmation. Program opens beside the still-visible table at the exact new cell. Confirm the Designer rule and purchase are in the same continuous chronological source as the room setup.
10. Continue playing normally or use Program's **Undo**, **Redo**, and **Fork from here** controls. The first player to reach 8 Prestige wins.

The live path uses GPT-5.6 Luna for Ivo and GPT-5.6 Designer for rule source. If either service is unavailable, the interface labels the deterministic fallback rather than presenting it as a model response.

## Normal play

Open <https://boardgamecomputer.com/> for an ordinary game without the hero coach.

- On a turn, take two different available Ruby, Sapphire, Emerald, or Amber crystals, or buy one affordable market card.
- Select any card to inspect its effective cost. Owned cards permanently discount future cards of their color. Prism tokens pay for any color.
- Prism abilities take an available wild token. Echo abilities grant another turn.
- Open the physical **Rulebook** card for the five compact rules.
- Mara is the local human seat. Ivo chooses automatically; if that request fails, use the visible **Play Ivo's turn** recovery action.
- Reach at least 8 Prestige to end the game. Program, history, undo, replay, and fork remain available afterward.

## Changing a rule

1. Choose **Change a rule** in the header or hero coach.
2. Enter a request in the Table Agent composer, or use the prepared Ruby Resonance request.
3. Choose **Ask the Designer**.
4. Confirm the committed rule appears both in the Table Agent conversation and on the physical House Rules card.
5. Expand **How this was validated** only if technical evidence is needed.

The browser parses, capability-validates, speculatively executes, exactly reverses, and only then commits candidate source. These implementation details are intentionally outside the ordinary conversation.

## AI-disabled fallback

With `AI_ENABLED=false`, or when a request is unavailable:

1. Take two highlighted crystals. Ivo still completes a legal deterministic move and the conversation identifies it as fallback.
2. Ask the Designer for Ruby Resonance. Confirm the failure message offers **Use labelled offline example**.
3. Choose that action, then buy Crimson Relay. Confirm the same locally validated rule fires.

The complete game never requires live AI to remain playable.

## Create and share a persistent room

The bare `/` and `/judge` routes are local games. Their header says **Local game**; copying those URLs does not invite another player.

1. Choose **Create shared room**.
2. Confirm the route changes to `/room/<roomId>` and the Share drawer opens automatically.
3. Confirm it shows a short Room ID, **Connected**, and role **Designer** without displaying a raw capability token.
4. Choose **Copy player invite**, or **Open player view** for a clean second browser context. Send the Player invite link—not the bare room URL—to another player.
5. Confirm the second browser joins as **Player** and its capability fragment disappears from the address bar after storage.
6. Play an action. Confirm both tables and Program histories converge.
7. Reload the Player browser and confirm reconnect restores the same head.
8. In Program, inspect an earlier prefix and choose **Fork from here**. Confirm the child room opens without changing the parent.

Player role can play but cannot submit Designer rule changes.

## Mobile path

At a Pixel 7-sized viewport, the full table remains the base surface. Fixed controls open **Table Agent**, **Program**, **Rulebook**, and **Share** as touch-safe drawers with an immediate close action. The hero path does not require scrolling through unrelated application panels.

## Expected production identity

- URLs: <https://boardgamecomputer.com/>, <https://boardgamecomputer.com/judge>, and generated `/room/<roomId>` routes
- Deployed commit: recorded in `STATUS.md` after verification
- Release state: **AWAITING OWNER PRODUCT APPROVAL**
- Final `build-week-submission` tag: intentionally absent
