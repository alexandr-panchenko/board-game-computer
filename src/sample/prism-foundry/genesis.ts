import type { FoundryCard, FoundryToken } from "./types";

export const PRISM_FOUNDRY_VERSION = "prism-foundry-v1";
export const PRISM_FOUNDRY_SEED = "prism-foundry-2026-1";

export interface GenesisCellSource {
  id: string;
  label: string;
  source: string;
}

const colors = ["ruby", "sapphire", "emerald", "amber"] as const;

const tokens: FoundryToken[] = [
  ...colors.flatMap((color) =>
    Array.from({ length: 5 }, (_, index) => ({
      id: `${color}-${String(index + 1)}`,
      color,
      containerId: "central-bank",
    })),
  ),
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `prism-${String(index + 1)}`,
    color: "prism" as const,
    containerId: "central-bank",
  })),
];

const cards: FoundryCard[] = [
  card(
    "crimson-relay",
    "Crimson Relay",
    "ruby",
    [1, 1, 0, 0],
    1,
    "none",
    "",
    "◇",
    "rays",
  ),
  card(
    "tidal-lens",
    "Tidal Lens",
    "sapphire",
    [0, 1, 1, 0],
    1,
    "none",
    "",
    "◉",
    "waves",
  ),
  card(
    "verdant-coil",
    "Verdant Coil",
    "emerald",
    [0, 0, 1, 1],
    1,
    "none",
    "",
    "⌁",
    "vines",
  ),
  card(
    "sunforge-die",
    "Sunforge Die",
    "amber",
    [1, 0, 0, 1],
    1,
    "none",
    "",
    "✦",
    "facets",
  ),
  card(
    "prism-loom",
    "Prism Loom",
    "ruby",
    [0, 1, 1, 1],
    1,
    "prism",
    "Gain 1 Prism",
    "✧",
    "lattice",
  ),
  card(
    "echo-vessel",
    "Echo Vessel",
    "sapphire",
    [1, 0, 1, 1],
    1,
    "echo",
    "Take another turn",
    "◎",
    "rings",
  ),
  card(
    "ember-press",
    "Ember Press",
    "ruby",
    [2, 0, 1, 0],
    2,
    "none",
    "",
    "▱",
    "rays",
  ),
  card(
    "deep-spectrum",
    "Deep Spectrum",
    "sapphire",
    [0, 2, 0, 1],
    2,
    "none",
    "",
    "◒",
    "waves",
  ),
  card(
    "moss-circuit",
    "Moss Circuit",
    "emerald",
    [1, 0, 2, 0],
    2,
    "none",
    "",
    "⌬",
    "vines",
  ),
  card(
    "auric-kiln",
    "Auric Kiln",
    "amber",
    [0, 1, 0, 2],
    2,
    "none",
    "",
    "✹",
    "facets",
  ),
  card(
    "wild-aperture",
    "Wild Aperture",
    "emerald",
    [1, 1, 0, 2],
    2,
    "prism",
    "Gain 1 Prism",
    "✧",
    "lattice",
  ),
  card(
    "resonant-anvil",
    "Resonant Anvil",
    "amber",
    [2, 1, 1, 0],
    2,
    "echo",
    "Take another turn",
    "◎",
    "rings",
  ),
  card(
    "ruby-crown",
    "Ruby Crown",
    "ruby",
    [3, 1, 1, 0],
    3,
    "none",
    "",
    "♢",
    "rays",
  ),
  card(
    "sapphire-arc",
    "Sapphire Arc",
    "sapphire",
    [0, 3, 1, 1],
    3,
    "none",
    "",
    "◐",
    "waves",
  ),
  card(
    "emerald-engine",
    "Emerald Engine",
    "emerald",
    [1, 0, 3, 1],
    3,
    "none",
    "",
    "⌘",
    "vines",
  ),
  card(
    "amber-heart",
    "Amber Heart",
    "amber",
    [1, 1, 0, 3],
    3,
    "none",
    "",
    "✺",
    "facets",
  ),
  card(
    "spectrum-bloom",
    "Spectrum Bloom",
    "ruby",
    [1, 2, 2, 1],
    3,
    "prism",
    "Gain 1 Prism",
    "✧",
    "lattice",
  ),
  card(
    "foundry-chorus",
    "Foundry Chorus",
    "sapphire",
    [2, 1, 1, 2],
    3,
    "echo",
    "Take another turn",
    "◎",
    "rings",
  ),
];

export const PRISM_FOUNDRY_GENESIS: GenesisCellSource[] = [
  {
    id: "genesis-table",
    label: "Create the physical table",
    source: `const game = {
  version: ${JSON.stringify(PRISM_FOUNDRY_VERSION)},
  seed: ${JSON.stringify(PRISM_FOUNDRY_SEED)},
  title: "Prism Foundry",
  objective: "Be the first player to reach 8 Prestige.",
  activePlayerId: "human",
  turnNumber: 1,
  started: false,
  result: null
};
const table = {
  id: "foundry-table",
  kind: "table",
  label: "Prism Foundry",
  finish: "indigo-felt",
  zones: []
};
trace("Created the Prism Foundry table");`,
  },
  {
    id: "genesis-bank",
    label: "Create the central crystal bank",
    source: `const crystalColors = ["ruby", "sapphire", "emerald", "amber"];
const allCrystalColors = ["ruby", "sapphire", "emerald", "amber", "prism"];
const bank = {
  id: "central-bank",
  kind: "bank",
  label: "Crystal Bank",
  ruby: 5,
  sapphire: 5,
  emerald: 5,
  amber: 5,
  prism: 3
};
table.zones.push(bank.id);
trace("Created the finite central bank");`,
  },
  {
    id: "genesis-player-mats",
    label: "Create Mara and Ivo player mats",
    source: `const players = [
  { id: "human", name: "Mara", matId: "mara-mat", prestige: 0, discounts: { ruby: 0, sapphire: 0, emerald: 0, amber: 0 } },
  { id: "ai", name: "Ivo", matId: "ivo-mat", prestige: 0, discounts: { ruby: 0, sapphire: 0, emerald: 0, amber: 0 } }
];
const playerMats = [
  { id: "mara-mat", kind: "player-mat", ownerId: "human", label: "Mara's Foundry" },
  { id: "ivo-mat", kind: "player-mat", ownerId: "ai", label: "Ivo's Foundry" }
];
table.zones.push("mara-mat");
table.zones.push("ivo-mat");
trace("Placed both player mats");`,
  },
  {
    id: "genesis-markers",
    label: "Create Prestige, discount, and turn markers",
    source: `const markers = [
  { id: "mara-prestige", kind: "prestige", ownerId: "human", value: 0 },
  { id: "ivo-prestige", kind: "prestige", ownerId: "ai", value: 0 },
  { id: "turn-marker", kind: "turn", ownerId: "human", value: 1 }
];
const rulebook = {
  id: "rulebook-card",
  title: "How the Foundry Works",
  objective: game.objective,
  turn: "Take two different crystals OR buy one market card.",
  payment: "Cards permanently discount later cards of the same color.",
  abilities: "Prism gains a wild token. Echo grants another turn."
};
const houseRules = [];
table.zones.push("rulebook-card");
table.zones.push("house-rules");
trace("Placed markers, Rulebook, and House Rules");`,
  },
  {
    id: "genesis-crystals",
    label: "Create every physical crystal token",
    source: `const crystalTokens = ${JSON.stringify(tokens, null, 2)};
trace("Created 23 finite crystal tokens");`,
  },
  {
    id: "genesis-cards",
    label: "Create the original card catalog and seeded deck",
    source: `const cards = ${JSON.stringify(cards, null, 2)};
const deck = [${cards.map((item) => JSON.stringify(item.id)).join(", ")}];
const deckSeed = game.seed;
trace("Created 18 original cards in seeded order");`,
  },
  {
    id: "genesis-market",
    label: "Create the market and deal six face-up cards",
    source: `const market = [];
const spentCards = [];
for (const slot of range(0, 6)) {
  const cardId = deck.shift();
  market.push(cardId);
  for (const card of cards) {
    if (card.id === cardId) card.location = "market";
  }
}
trace("Dealt six cards to the market");`,
  },
  {
    id: "genesis-actions",
    label: "Register the two ordinary actions",
    source: `const actionDefinitions = [
  { id: "take-crystals", label: "Take two different crystals", kind: "token-pair" },
  { id: "buy-card", label: "Buy one market card", kind: "market-card" }
];
let legalOptions = [];
trace("Registered Take Crystals and Buy Card");`,
  },
  {
    id: "genesis-take",
    label: "Define crystal selection and physical token movement",
    source: `function findPlayer(playerId) {
  for (const player of players) if (player.id === playerId) return player;
  assert(false, "Unknown player");
}
function findCard(cardId) {
  for (const card of cards) if (card.id === cardId) return card;
  assert(false, "Unknown card");
}
function countTokens(containerId, color) {
  let total = 0;
  for (const token of crystalTokens) {
    if (token.containerId === containerId && token.color === color) total += 1;
  }
  return total;
}
function moveOneToken(color, fromId, toId) {
  for (const token of crystalTokens) {
    if (token.color === color && token.containerId === fromId) {
      token.containerId = toId;
      return true;
    }
  }
  return false;
}
function takeCrystals(playerId, first, second) {
  assert(first !== second, "Choose two different colors");
  assert(crystalColors.includes(first) && crystalColors.includes(second), "Choose ordinary crystals");
  assert(moveOneToken(first, bank.id, findPlayer(playerId).matId), "First crystal is unavailable");
  assert(moveOneToken(second, bank.id, findPlayer(playerId).matId), "Second crystal is unavailable");
  trace("Moved two crystals from bank to player mat");
}
trace("Defined finite crystal transfers");`,
  },
  {
    id: "genesis-payment",
    label: "Define payment and permanent discounts",
    source: `function discountedNeed(player, card, color) {
  return max(0, card.cost[color] - player.discounts[color]);
}
function canAfford(player, card) {
  let missing = 0;
  for (const color of crystalColors) {
    const need = discountedNeed(player, card, color);
    const owned = countTokens(player.matId, color);
    if (owned < need) missing += need - owned;
  }
  return missing <= countTokens(player.matId, "prism");
}
function payForCard(player, card) {
  let prismDue = 0;
  for (const color of crystalColors) {
    const need = discountedNeed(player, card, color);
    const owned = countTokens(player.matId, color);
    const coloredPayment = min(need, owned);
    for (const unit of range(0, coloredPayment)) moveOneToken(color, player.matId, bank.id);
    prismDue += need - coloredPayment;
  }
  for (const unit of range(0, prismDue)) {
    assert(moveOneToken("prism", player.matId, bank.id), "Prism payment missing");
  }
  trace("Returned paid crystals to the central bank");
}
trace("Defined discounts and wild Prism payment");`,
  },
  {
    id: "genesis-abilities",
    label: "Define Prism, Echo, and House Rules",
    source: `function gainPrism(player) {
  if (moveOneToken("prism", bank.id, player.matId)) trace("Prism ability moved a wild token to the player");
}
function resolveAbility(player, card) {
  let anotherTurn = false;
  if (card.ability === "prism") gainPrism(player);
  if (card.ability === "echo") {
    anotherTurn = true;
    trace("Echo granted another turn");
  }
  return anotherTurn;
}
function addHouseRule(name, rule) {
  houseRules.push({ name: name, when: rule.when, then: rule.then });
  trace("Committed a House Rule");
}
function applyHouseRules(player, card) {
  for (const rule of houseRules) {
    if (rule.when === "buy-ruby" && card.discountColor === "ruby" && rule.then === "gain-prism") {
      gainPrism(player);
      trace("House Rule fired: Ruby purchase gained a Prism");
    }
  }
}
trace("Defined card abilities and interpreted House Rules");`,
  },
  {
    id: "genesis-refill",
    label: "Define deterministic market refill",
    source: `function refillOneMarketSlot() {
  if (deck.length > 0 && market.length < 6) {
    const nextId = deck.shift();
    market.push(nextId);
    findCard(nextId).location = "market";
    trace("Refilled the market from the seeded deck");
  }
}
trace("Defined deterministic market refill");`,
  },
  {
    id: "genesis-turns",
    label: "Define turn progression",
    source: `function passTurn() {
  if (game.activePlayerId === "human") game.activePlayerId = "ai";
  else game.activePlayerId = "human";
  game.turnNumber += 1;
  for (const marker of markers) {
    if (marker.id === "turn-marker") {
      marker.ownerId = game.activePlayerId;
      marker.value = game.turnNumber;
    }
  }
  trace("Passed the physical turn marker");
}
trace("Defined one-action turns");`,
  },
  {
    id: "genesis-victory",
    label: "Define the 8 Prestige victory rule",
    source: `function checkVictory(player) {
  if (player.prestige >= 8 && game.result === null) {
    game.result = { type: "prestige-victory", winnerId: player.id, winnerName: player.name, prestige: player.prestige };
    legalOptions.splice(0, legalOptions.length);
    trace("Victory: first player reached 8 Prestige");
    return true;
  }
  return false;
}
trace("Defined the immutable victory check");`,
  },
  {
    id: "genesis-buy",
    label: "Define buying, legal options, and action execution",
    source: `function refreshLegalOptions() {
  legalOptions.splice(0, legalOptions.length);
  if (game.result !== null) return;
  const actorId = game.activePlayerId;
  const player = findPlayer(actorId);
  for (const first of crystalColors) {
    for (const second of crystalColors) {
      if (first < second && countTokens(bank.id, first) > 0 && countTokens(bank.id, second) > 0) {
        legalOptions.push({ id: "take:" + first + ":" + second, actionId: "take-crystals", actorId: actorId, label: "Take " + first + " + " + second, first: first, second: second });
      }
    }
  }
  for (const cardId of market) {
    const card = findCard(cardId);
    if (canAfford(player, card)) legalOptions.push({ id: "buy:" + cardId, actionId: "buy-card", actorId: actorId, label: "Buy " + card.name, cardId: cardId });
  }
}
function buyCard(playerId, cardId) {
  const player = findPlayer(playerId);
  const card = findCard(cardId);
  assert(market.includes(cardId), "Card is not in the market");
  assert(canAfford(player, card), "Card is not affordable");
  payForCard(player, card);
  market.splice(market.indexOf(cardId), 1);
  card.location = "tableau";
  card.ownerId = player.id;
  player.discounts[card.discountColor] += 1;
  player.prestige += card.prestige;
  for (const marker of markers) if (marker.ownerId === player.id && marker.kind === "prestige") marker.value = player.prestige;
  trace("Moved purchased card to tableau and increased its discount color");
  const anotherTurn = resolveAbility(player, card);
  applyHouseRules(player, card);
  refillOneMarketSlot();
  if (checkVictory(player)) return;
  if (!anotherTurn) passTurn();
}
function performAction(actionId, parameters) {
  assert(game.result === null, "The game has ended");
  assert(parameters.actorId === game.activePlayerId, "Only the active player may act");
  if (actionId === "take-crystals") {
    takeCrystals(parameters.actorId, parameters.first, parameters.second);
    passTurn();
  } else {
    if (actionId === "buy-card") buyCard(parameters.actorId, parameters.cardId);
    else assert(false, "Unknown action");
  }
  refreshLegalOptions();
}
trace("Defined Buy Card and the shared action executor");`,
  },
  {
    id: "genesis-start",
    label: "Execute setup and begin Mara's first turn",
    source: `game.started = true;
refreshLegalOptions();
trace("Mara begins with one ordinary action");`,
  },
];

function card(
  id: string,
  name: string,
  discountColor: FoundryCard["discountColor"],
  [ruby, sapphire, emerald, amber]: [number, number, number, number],
  prestige: number,
  ability: FoundryCard["ability"],
  abilityText: string,
  symbol: string,
  pattern: string,
): FoundryCard {
  return {
    id,
    name,
    discountColor,
    cost: { ruby, sapphire, emerald, amber },
    prestige,
    ability,
    abilityText,
    art: { symbol, pattern },
    location: "deck",
    ownerId: null,
  };
}
