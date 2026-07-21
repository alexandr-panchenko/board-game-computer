import type { LegalActionOption, RuntimePatch } from "../../runtime";
import type { TraceEvent } from "../../runtime/store/types";

export type CrystalColor = "ruby" | "sapphire" | "emerald" | "amber" | "prism";

export type OrdinaryCrystalColor = Exclude<CrystalColor, "prism">;
export type CardAbility = "none" | "prism" | "echo";

export interface FoundryToken {
  id: string;
  color: CrystalColor;
  containerId: string;
}

export interface FoundryCard {
  id: string;
  name: string;
  discountColor: OrdinaryCrystalColor;
  cost: Record<OrdinaryCrystalColor, number>;
  prestige: number;
  ability: CardAbility;
  abilityText: string;
  art: { symbol: string; pattern: string };
  location: "deck" | "market" | "tableau" | "spent";
  ownerId: string | null;
}

export interface FoundryPlayer {
  id: "human" | "ai";
  name: "Mara" | "Ivo";
  matId: string;
  prestige: number;
  discounts: Record<OrdinaryCrystalColor, number>;
}

export interface FoundryHouseRule {
  name: string;
  when: "buy-ruby";
  then: "gain-prism";
}

export interface FoundryResult {
  type: "prestige-victory";
  winnerId: "human" | "ai";
  winnerName: string;
  prestige: number;
}

export interface FoundrySnapshot {
  version: string;
  seed: string;
  title: string;
  objective: string;
  activePlayerId: "human" | "ai";
  turnNumber: number;
  result: FoundryResult | null;
  bank: Record<CrystalColor, number>;
  tokens: FoundryToken[];
  cards: FoundryCard[];
  deck: string[];
  market: string[];
  spent: string[];
  players: Record<"human" | "ai", FoundryPlayer>;
  houseRules: FoundryHouseRule[];
  legalActions: LegalActionOption[];
  stateHash: string;
}

export type FoundryCellKind = "genesis" | "action" | "designer";

export interface FoundryProgramCell {
  id: string;
  number: number;
  kind: FoundryCellKind;
  label: string;
  source: string;
  trace: TraceEvent[];
  patchCount: number;
  beforeHash: string;
  afterHash: string;
  forward: RuntimePatch;
  inverse: RuntimePatch;
}
