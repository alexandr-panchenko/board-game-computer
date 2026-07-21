import type { FrameworkData, LegalActionOption } from "../../runtime";
import type { RoomEdge } from "../../geometry";

export const SHIFTING_VAULTS_VERSION = "shifting-vaults-v1";
export const DEFAULT_VAULT_SEED = "judge-vault-2026-4";

export interface VaultZone {
  [key: string]: FrameworkData;
  id: string;
  label: string;
  row: number;
  column: number;
  doors: RoomEdge[];
  rotation: 0 | 90 | 180 | 270;
  tags: string[];
  linkedRoomId: string | null;
  searched: boolean;
  tokenId: string | null;
}

export interface VaultExplorer {
  [key: string]: FrameworkData;
  id: string;
  kind: "explorer";
  ownerId: string;
  zoneId: string;
  tags: string[];
  relicCount: number;
  actionPoints: number;
  hand: string[];
  tacticPlayedThisTurn: boolean;
}

export interface VaultToken {
  [key: string]: FrameworkData;
  id: string;
  kind: "relic" | "hazard";
  roomId: string | null;
  location: "room" | "relic-area" | "hazard-discard";
  ownerId: string | null;
  revealed: boolean;
}

export interface VaultCard {
  [key: string]: FrameworkData;
  id: string;
  kind: "sprint" | "gear" | "survey" | "ward";
  label: string;
  location: "draw" | "discard" | "human-hand" | "ai-hand";
}

export interface VaultDeck {
  [key: string]: FrameworkData;
  id: string;
  draw: string[];
  discard: string[];
}

export interface VaultCounter {
  [key: string]: FrameworkData;
  id: string;
  value: number;
  minimum: number;
  maximum: number;
}

export interface VaultResult {
  [key: string]: FrameworkData;
  type: "explorer-escaped" | "vault-collapse";
  winnerSeatId: string | null;
  round: number;
}

export interface VaultSnapshot {
  version: string;
  seed: string;
  round: number;
  activeSeatId: string;
  result: VaultResult | null;
  zones: Record<string, VaultZone>;
  explorers: Record<string, VaultExplorer>;
  tokens: Record<string, VaultToken>;
  cards: Record<string, VaultCard>;
  deck: VaultDeck;
  threat: VaultCounter;
  legalActions: LegalActionOption[];
  stateHash: string;
}

export interface ReplayFixtureCell {
  id: string;
  actor: "human" | "ai";
  label: string;
  source: string;
  trace: string[];
}
