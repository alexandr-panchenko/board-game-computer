import type { CommittedTransaction, RuntimeValue } from "../store/types";

export type FrameworkScalar = string | number | boolean | null;
export type FrameworkData =
  FrameworkScalar | FrameworkData[] | { [key: string]: FrameworkData };

export type RegistryName =
  | "zones"
  | "entities"
  | "players"
  | "cards"
  | "decks"
  | "counters"
  | "actions"
  | "scenarios"
  | "invariants";

export interface FrameworkEvent {
  type: string;
  payload: Record<string, FrameworkData>;
}

export interface LegalActionOption {
  id: string;
  actionId: string;
  actorId: string;
  label: string;
  parameters: Record<string, string>;
  ui: {
    gesture: "button" | "drag" | "card";
    highlight?: string;
  };
}

export interface FrameworkRuntimeView {
  hash(): string;
  state<T extends FrameworkData = FrameworkData>(key: string): T;
  item<T extends FrameworkData = FrameworkData>(
    registry: RegistryName,
    id: string,
  ): T | null;
  items<T extends FrameworkData = FrameworkData>(
    registry: RegistryName,
  ): Record<string, T>;
}

export interface FrameworkRuntimeMutation extends FrameworkRuntimeView {
  setState(key: string, value: FrameworkData): void;
  setItem(registry: RegistryName, id: string, value: FrameworkData): void;
  patchItem(
    registry: RegistryName,
    id: string,
    changes: Record<string, FrameworkData>,
  ): void;
  removeItem(registry: RegistryName, id: string): void;
  emit(type: string, payload?: Record<string, FrameworkData>): void;
  trace(label: string, details?: Record<string, FrameworkScalar>): void;
  randomInt(minInclusive: number, maxExclusive: number): number;
  shuffle<T>(items: readonly T[]): T[];
}

export interface ActionDefinition {
  id: string;
  label: string;
  actorRole: string;
  ui: LegalActionOption["ui"];
  materialize: (
    runtime: FrameworkRuntimeView,
    actorId: string,
  ) => Array<{ parameters: Record<string, string> }>;
  perform: (
    runtime: FrameworkRuntimeMutation,
    actorId: string,
    parameters: Record<string, string>,
  ) => void;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  when: "after";
  matches: (runtime: FrameworkRuntimeView, event: FrameworkEvent) => boolean;
  effect: (runtime: FrameworkRuntimeMutation, event: FrameworkEvent) => void;
}

export interface InvariantDefinition {
  id: string;
  name: string;
  check: (runtime: FrameworkRuntimeView) => boolean;
}

export interface FrameworkCommit {
  cellId: string;
  transaction: CommittedTransaction;
}

export interface FrameworkFailure {
  cellId: string;
  code: string;
  message: string;
  beforeHash: string;
  afterHash: string;
}

export type FrameworkResult<T> =
  | { ok: true; value: T; commit: FrameworkCommit }
  | { ok: false; failure: FrameworkFailure };

export interface FrameworkRefs {
  root: RuntimeValue;
  registries: Record<RegistryName, RuntimeValue>;
}
