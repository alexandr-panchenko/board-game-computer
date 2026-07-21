import type { BaseFunction, Node, Pattern } from "estree";

export type ScopeId = `scope:${number}`;
export type SlotId = `slot:${number}`;
export type ObjectId = `object:${number}`;
export type FunctionId = `function:${number}`;

export type RuntimeValue =
  | { type: "undefined" }
  | { type: "null" }
  | { type: "boolean"; value: boolean }
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "object"; objectId: ObjectId }
  | { type: "function"; functionId: FunctionId }
  | { type: "native-function"; nativeId: string };

export const UNDEFINED: RuntimeValue = Object.freeze({ type: "undefined" });
export const NULL: RuntimeValue = Object.freeze({ type: "null" });

export interface RuntimeScope {
  id: ScopeId;
  parentId: ScopeId | null;
  bindings: Map<string, SlotId>;
}

export interface RuntimeSlot {
  id: SlotId;
  initialized: boolean;
  mutable: boolean;
  value: RuntimeValue;
}

export type RuntimeHeapObject =
  | { id: ObjectId; kind: "record"; properties: Map<string, RuntimeValue> }
  | { id: ObjectId; kind: "array"; items: RuntimeValue[] };

export interface InterpretedFunction {
  id: FunctionId;
  name?: string;
  parameters: Pattern[];
  body: BaseFunction["body"];
  closureScopeId: ScopeId;
  expressionBody: boolean;
  sourceStart: number;
  sourceEnd: number;
}

export type AllocatorName = "scope" | "slot" | "object" | "function";

export type Mutation =
  | {
      kind: "allocator.set";
      allocator: AllocatorName;
      before: number;
      after: number;
    }
  | {
      kind: "scope.set";
      id: ScopeId;
      before: RuntimeScope | null;
      after: RuntimeScope | null;
    }
  | {
      kind: "binding.set";
      scopeId: ScopeId;
      name: string;
      before: SlotId | null;
      after: SlotId | null;
    }
  | {
      kind: "slot.set";
      id: SlotId;
      before: RuntimeSlot | null;
      after: RuntimeSlot | null;
    }
  | {
      kind: "heap.set";
      id: ObjectId;
      before: RuntimeHeapObject | null;
      after: RuntimeHeapObject | null;
    }
  | {
      kind: "property.set";
      objectId: ObjectId;
      key: string;
      before: RuntimeValue | null;
      after: RuntimeValue | null;
    }
  | {
      kind: "array.set";
      objectId: ObjectId;
      before: RuntimeValue[];
      after: RuntimeValue[];
    }
  | {
      kind: "function.set";
      id: FunctionId;
      before: InterpretedFunction | null;
      after: InterpretedFunction | null;
    };

export interface TraceEvent {
  type: string;
  label: string;
  details?: Record<string, string | number | boolean | null>;
  sourceStart?: number;
  sourceEnd?: number;
}

export interface RuntimePatch {
  cellId: string;
  direction: "forward" | "inverse";
  mutations: ReadonlyArray<Mutation>;
  fromStateHash: string;
  toStateHash: string;
  trace: ReadonlyArray<TraceEvent>;
}

export interface FunctionDefinition {
  name?: string;
  parameters: Pattern[];
  body: BaseFunction["body"];
  closureScopeId: ScopeId;
  expressionBody: boolean;
  node: Node;
}

export interface CommittedTransaction {
  forward: RuntimePatch;
  inverse: RuntimePatch;
  changedIds: ReadonlySet<string>;
}
