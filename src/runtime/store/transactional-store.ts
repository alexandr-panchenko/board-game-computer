import { stableHash } from "./hash";
import {
  NULL,
  UNDEFINED,
  type AllocatorName,
  type CommittedTransaction,
  type FunctionDefinition,
  type FunctionId,
  type InterpretedFunction,
  type Mutation,
  type ObjectId,
  type RuntimeHeapObject,
  type RuntimePatch,
  type RuntimeScope,
  type RuntimeSlot,
  type RuntimeValue,
  type ScopeId,
  type SlotId,
  type TraceEvent,
} from "./types";

interface OpenTransaction {
  cellId: string;
  beforeHash: string;
  mutations: Mutation[];
  trace: TraceEvent[];
  changedIds: Set<string>;
}

const clone = <T>(value: T): T => structuredClone(value);
const compareText = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

export class TransactionalStore {
  readonly globalScopeId: ScopeId = "scope:0";
  private readonly scopes = new Map<ScopeId, RuntimeScope>();
  private readonly slots = new Map<SlotId, RuntimeSlot>();
  private readonly heap = new Map<ObjectId, RuntimeHeapObject>();
  private readonly functions = new Map<FunctionId, InterpretedFunction>();
  private readonly allocators: Record<AllocatorName, number> = {
    scope: 1,
    slot: 0,
    object: 0,
    function: 0,
  };
  private transaction: OpenTransaction | null = null;

  constructor() {
    this.scopes.set(this.globalScopeId, {
      id: this.globalScopeId,
      parentId: null,
      bindings: new Map(),
    });
  }

  get transactionOpen(): boolean {
    return this.transaction !== null;
  }

  get heapObjectCount(): number {
    return this.heap.size;
  }

  begin(cellId: string): void {
    if (this.transaction !== null)
      throw new Error("A runtime transaction is already open");
    this.transaction = {
      cellId,
      beforeHash: this.hash(),
      mutations: [],
      trace: [],
      changedIds: new Set(),
    };
  }

  commit(): CommittedTransaction {
    const transaction = this.requireTransaction();
    const afterHash = this.hash();
    const forwardMutations = clone(transaction.mutations);
    const inverseMutations = clone(transaction.mutations)
      .reverse()
      .map((mutation) => this.reverseMutation(mutation));
    const trace = clone(transaction.trace);
    this.transaction = null;
    return {
      forward: {
        cellId: transaction.cellId,
        direction: "forward",
        mutations: forwardMutations,
        fromStateHash: transaction.beforeHash,
        toStateHash: afterHash,
        trace,
      },
      inverse: {
        cellId: transaction.cellId,
        direction: "inverse",
        mutations: inverseMutations,
        fromStateHash: afterHash,
        toStateHash: transaction.beforeHash,
        trace,
      },
      changedIds: new Set(transaction.changedIds),
    };
  }

  rollback(): void {
    const transaction = this.requireTransaction();
    for (const mutation of [...transaction.mutations].reverse()) {
      this.applyMutation(this.reverseMutation(mutation), false);
    }
    this.transaction = null;
    if (this.hash() !== transaction.beforeHash)
      throw new Error("Rollback state hash mismatch");
  }

  applyPatch(patch: RuntimePatch): void {
    if (this.transaction !== null)
      throw new Error("Cannot apply a patch during a transaction");
    if (this.hash() !== patch.fromStateHash)
      throw new Error("Patch source hash mismatch");
    for (const mutation of patch.mutations) this.applyMutation(mutation, false);
    if (this.hash() !== patch.toStateHash)
      throw new Error("Patch destination hash mismatch");
  }

  trace(event: TraceEvent): void {
    this.requireTransaction().trace.push(clone(event));
  }

  createScope(parentId: ScopeId): ScopeId {
    if (!this.scopes.has(parentId))
      throw new Error(`Unknown parent scope ${parentId}`);
    const id = this.allocate("scope") as ScopeId;
    this.record({
      kind: "scope.set",
      id,
      before: null,
      after: { id, parentId, bindings: new Map() },
    });
    return id;
  }

  createBinding(
    scopeId: ScopeId,
    name: string,
    mutable: boolean,
    value = UNDEFINED,
    initialized = true,
  ): SlotId {
    const scope = this.requireScope(scopeId);
    if (scope.bindings.has(name)) throw new Error(`Duplicate binding ${name}`);
    const id = this.allocate("slot") as SlotId;
    this.record({
      kind: "slot.set",
      id,
      before: null,
      after: { id, initialized, mutable, value: clone(value) },
    });
    this.record({
      kind: "binding.set",
      scopeId,
      name,
      before: null,
      after: id,
    });
    return id;
  }

  replaceTopLevelBinding(name: string, value: RuntimeValue): void {
    const scope = this.requireScope(this.globalScopeId);
    const slotId = scope.bindings.get(name);
    if (slotId === undefined) {
      this.createBinding(this.globalScopeId, name, false, value);
      return;
    }
    const slot = this.requireSlot(slotId);
    this.record({
      kind: "slot.set",
      id: slotId,
      before: slot,
      after: { ...slot, initialized: true, value: clone(value) },
    });
  }

  resolveSlot(scopeId: ScopeId, name: string): RuntimeSlot | null {
    let current: ScopeId | null = scopeId;
    while (current !== null) {
      const scope = this.requireScope(current);
      const slotId = scope.bindings.get(name);
      if (slotId !== undefined) return this.requireSlot(slotId);
      current = scope.parentId;
    }
    return null;
  }

  readBinding(scopeId: ScopeId, name: string): RuntimeValue {
    const slot = this.resolveSlot(scopeId, name);
    if (slot === null) throw new Error(`Unknown identifier ${name}`);
    if (!slot.initialized)
      throw new Error(`Binding ${name} is not initialized`);
    return clone(slot.value);
  }

  setBinding(scopeId: ScopeId, name: string, value: RuntimeValue): void {
    const slot = this.resolveSlot(scopeId, name);
    if (slot === null) throw new Error(`Unknown identifier ${name}`);
    if (!slot.mutable) throw new Error(`Cannot assign const binding ${name}`);
    this.record({
      kind: "slot.set",
      id: slot.id,
      before: slot,
      after: { ...slot, initialized: true, value: clone(value) },
    });
  }

  allocateRecord(
    properties: ReadonlyArray<readonly [string, RuntimeValue]>,
  ): RuntimeValue {
    const id = this.allocate("object") as ObjectId;
    this.record({
      kind: "heap.set",
      id,
      before: null,
      after: {
        id,
        kind: "record",
        properties: new Map(
          properties.map(([key, value]) => [key, clone(value)]),
        ),
      },
    });
    return { type: "object", objectId: id };
  }

  allocateArray(items: RuntimeValue[]): RuntimeValue {
    const id = this.allocate("object") as ObjectId;
    this.record({
      kind: "heap.set",
      id,
      before: null,
      after: { id, kind: "array", items: clone(items) },
    });
    return { type: "object", objectId: id };
  }

  getHeapObject(id: ObjectId): RuntimeHeapObject {
    const object = this.heap.get(id);
    if (object === undefined) throw new Error(`Unknown object ${id}`);
    return clone(object);
  }

  getProperty(reference: RuntimeValue, key: string): RuntimeValue {
    if (reference.type === "string" && key === "length")
      return this.number(reference.value.length);
    if (reference.type !== "object")
      throw new Error(`Cannot read property ${key}`);
    const object = this.getHeapObject(reference.objectId);
    if (object.kind === "array") {
      if (key === "length") return this.number(object.items.length);
      const index = this.arrayIndex(key);
      return index === null
        ? UNDEFINED
        : clone(object.items[index] ?? UNDEFINED);
    }
    return clone(object.properties.get(key) ?? UNDEFINED);
  }

  setProperty(reference: RuntimeValue, key: string, value: RuntimeValue): void {
    if (reference.type !== "object")
      throw new Error(`Cannot set property ${key}`);
    const object = this.getHeapObject(reference.objectId);
    if (object.kind === "array") {
      const index = this.arrayIndex(key);
      if (index === null) throw new Error(`Invalid array property ${key}`);
      const after = clone(object.items);
      while (after.length < index) after.push(UNDEFINED);
      after[index] = clone(value);
      this.record({
        kind: "array.set",
        objectId: reference.objectId,
        before: object.items,
        after,
      });
      return;
    }
    const before = object.properties.get(key) ?? null;
    this.record({
      kind: "property.set",
      objectId: reference.objectId,
      key,
      before,
      after: clone(value),
    });
  }

  replaceArray(reference: RuntimeValue, items: RuntimeValue[]): void {
    if (reference.type !== "object")
      throw new Error("Expected array reference");
    const object = this.getHeapObject(reference.objectId);
    if (object.kind !== "array") throw new Error("Expected array reference");
    this.record({
      kind: "array.set",
      objectId: reference.objectId,
      before: object.items,
      after: clone(items),
    });
  }

  allocateFunction(definition: FunctionDefinition): RuntimeValue {
    const id = this.allocate("function") as FunctionId;
    const fn: InterpretedFunction = {
      id,
      parameters: clone(definition.parameters),
      body: clone(definition.body),
      closureScopeId: definition.closureScopeId,
      expressionBody: definition.expressionBody,
      sourceStart:
        (definition.node as typeof definition.node & { start?: number })
          .start ?? -1,
      sourceEnd:
        (definition.node as typeof definition.node & { end?: number }).end ??
        -1,
      ...(definition.name === undefined ? {} : { name: definition.name }),
    };
    this.record({ kind: "function.set", id, before: null, after: fn });
    return { type: "function", functionId: id };
  }

  getFunction(id: FunctionId): InterpretedFunction {
    const fn = this.functions.get(id);
    if (fn === undefined) throw new Error(`Unknown function ${id}`);
    return clone(fn);
  }

  globalBindings(): Record<string, RuntimeValue> {
    const result: Record<string, RuntimeValue> = {};
    for (const [name, slotId] of [
      ...this.requireScope(this.globalScopeId).bindings,
    ].sort(([a], [b]) => compareText(a, b))) {
      const slot = this.requireSlot(slotId);
      if (slot.initialized) result[name] = clone(slot.value);
    }
    return result;
  }

  hash(): string {
    return stableHash(this.canonicalState());
  }

  number(value: number): RuntimeValue {
    if (!Number.isFinite(value)) throw new Error("Non-finite runtime number");
    return { type: "number", value };
  }

  fromHost(value: string | number | boolean | null | undefined): RuntimeValue {
    if (value === undefined) return UNDEFINED;
    if (value === null) return NULL;
    if (typeof value === "number") return this.number(value);
    if (typeof value === "string") return { type: "string", value };
    return { type: "boolean", value };
  }

  private canonicalState(): unknown {
    const value = (item: RuntimeValue): unknown => item;
    return {
      allocators: this.allocators,
      scopes: [...this.scopes.values()]
        .sort((a, b) => compareText(a.id, b.id))
        .map((scope) => ({
          id: scope.id,
          parentId: scope.parentId,
          bindings: [...scope.bindings].sort(([a], [b]) => compareText(a, b)),
        })),
      slots: [...this.slots.values()]
        .sort((a, b) => compareText(a.id, b.id))
        .map((slot) => ({ ...slot, value: value(slot.value) })),
      heap: [...this.heap.values()]
        .sort((a, b) => compareText(a.id, b.id))
        .map((object) =>
          object.kind === "array"
            ? {
                id: object.id,
                kind: object.kind,
                items: object.items.map(value),
              }
            : {
                id: object.id,
                kind: object.kind,
                properties: [...object.properties].sort(([a], [b]) =>
                  compareText(a, b),
                ),
              },
        ),
      functions: [...this.functions.values()]
        .sort((a, b) => compareText(a.id, b.id))
        .map((fn) => ({
          id: fn.id,
          name: fn.name ?? null,
          parameters: fn.parameters.map((parameter) =>
            parameter.type === "Identifier" ? parameter.name : parameter.type,
          ),
          closureScopeId: fn.closureScopeId,
          expressionBody: fn.expressionBody,
          sourceStart: fn.sourceStart,
          sourceEnd: fn.sourceEnd,
          body: fn.body,
        })),
    };
  }

  private allocate(allocator: AllocatorName): string {
    const before = this.allocators[allocator];
    const after = before + 1;
    this.record({ kind: "allocator.set", allocator, before, after });
    return `${allocator}:${before}`;
  }

  private record(mutation: Mutation): void {
    const transaction = this.requireTransaction();
    this.applyMutation(mutation, false);
    transaction.mutations.push(clone(mutation));
    if ("id" in mutation) transaction.changedIds.add(mutation.id);
    if ("objectId" in mutation) transaction.changedIds.add(mutation.objectId);
  }

  private applyMutation(mutation: Mutation, record: boolean): void {
    if (record) throw new Error("Nested mutation recording is unsupported");
    switch (mutation.kind) {
      case "allocator.set":
        this.allocators[mutation.allocator] = mutation.after;
        break;
      case "scope.set":
        this.setMapValue(this.scopes, mutation.id, mutation.after);
        break;
      case "slot.set":
        this.setMapValue(this.slots, mutation.id, mutation.after);
        break;
      case "heap.set":
        this.setMapValue(this.heap, mutation.id, mutation.after);
        break;
      case "function.set":
        this.setMapValue(this.functions, mutation.id, mutation.after);
        break;
      case "binding.set": {
        const scope = this.scopes.get(mutation.scopeId);
        if (scope === undefined)
          throw new Error(`Unknown scope ${mutation.scopeId}`);
        if (mutation.after === null) scope.bindings.delete(mutation.name);
        else scope.bindings.set(mutation.name, mutation.after);
        break;
      }
      case "property.set": {
        const object = this.heap.get(mutation.objectId);
        if (object === undefined || object.kind !== "record")
          throw new Error("Invalid record mutation");
        if (mutation.after === null) object.properties.delete(mutation.key);
        else object.properties.set(mutation.key, clone(mutation.after));
        break;
      }
      case "array.set": {
        const object = this.heap.get(mutation.objectId);
        if (object === undefined || object.kind !== "array")
          throw new Error("Invalid array mutation");
        object.items = clone(mutation.after);
        break;
      }
    }
  }

  private reverseMutation(mutation: Mutation): Mutation {
    switch (mutation.kind) {
      case "allocator.set":
        return { ...mutation, before: mutation.after, after: mutation.before };
      case "scope.set":
        return {
          ...mutation,
          before: clone(mutation.after),
          after: clone(mutation.before),
        };
      case "binding.set":
        return { ...mutation, before: mutation.after, after: mutation.before };
      case "slot.set":
        return {
          ...mutation,
          before: clone(mutation.after),
          after: clone(mutation.before),
        };
      case "heap.set":
        return {
          ...mutation,
          before: clone(mutation.after),
          after: clone(mutation.before),
        };
      case "property.set":
        return {
          ...mutation,
          before: clone(mutation.after),
          after: clone(mutation.before),
        };
      case "array.set":
        return {
          ...mutation,
          before: clone(mutation.after),
          after: clone(mutation.before),
        };
      case "function.set":
        return {
          ...mutation,
          before: clone(mutation.after),
          after: clone(mutation.before),
        };
    }
  }

  private setMapValue<K, V>(map: Map<K, V>, key: K, value: V | null): void {
    if (value === null) map.delete(key);
    else map.set(key, clone(value));
  }

  private requireTransaction(): OpenTransaction {
    if (this.transaction === null)
      throw new Error("No runtime transaction is open");
    return this.transaction;
  }

  private requireScope(id: ScopeId): RuntimeScope {
    const scope = this.scopes.get(id);
    if (scope === undefined) throw new Error(`Unknown scope ${id}`);
    return clone(scope);
  }

  private requireSlot(id: SlotId): RuntimeSlot {
    const slot = this.slots.get(id);
    if (slot === undefined) throw new Error(`Unknown slot ${id}`);
    return clone(slot);
  }

  private arrayIndex(key: string): number | null {
    if (!/^(0|[1-9]\d*)$/.test(key)) return null;
    const index = Number(key);
    return Number.isSafeInteger(index) ? index : null;
  }
}
