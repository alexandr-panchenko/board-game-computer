import { RuntimeFault } from "../parser/diagnostics";
import { TransactionalStore } from "../store/transactional-store";
import type { RuntimePatch, RuntimeValue } from "../store/types";
import { nextRandom, PRNG_VERSION, seedFromText } from "./random";
import type {
  ActionDefinition,
  FrameworkData,
  FrameworkEvent,
  FrameworkRefs,
  FrameworkResult,
  InvariantDefinition,
  LegalActionOption,
  RegistryName,
  ScenarioDefinition,
} from "./types";

const registryNames: RegistryName[] = [
  "zones",
  "entities",
  "players",
  "cards",
  "decks",
  "counters",
  "actions",
  "scenarios",
  "invariants",
];

interface HistoryEntry {
  forward: RuntimePatch;
  inverse: RuntimePatch;
}

export class FrameworkRuntime {
  readonly store = new TransactionalStore();
  readonly refs: FrameworkRefs;
  private readonly actionDefinitions = new Map<string, ActionDefinition>();
  private readonly scenarioDefinitions: ScenarioDefinition[] = [];
  private readonly invariantDefinitions: InvariantDefinition[] = [];
  private readonly history: HistoryEntry[] = [];
  private readonly triggerLimit: number;
  private cursor = 0;
  private eventQueue: FrameworkEvent[] | null = null;

  constructor(seed: string, triggerLimit = 100) {
    this.triggerLimit = triggerLimit;
    this.store.begin("framework:bootstrap");
    const registries = Object.fromEntries(
      registryNames.map((name) => [name, this.store.allocateRecord([])]),
    ) as Record<RegistryName, RuntimeValue>;
    const root = this.store.allocateRecord([
      ["seed", this.store.fromHost(seed)],
      ["prngVersion", this.store.fromHost(PRNG_VERSION)],
      ["rngState", this.store.number(seedFromText(seed))],
      ["scenarioSequence", this.store.number(0)],
      ["result", this.store.fromHost(null)],
      ...registryNames.map((name) => [name, registries[name]] as const),
    ]);
    this.store.createBinding(this.store.globalScopeId, "table", false, root);
    this.store.commit();
    this.refs = { root, registries };
  }

  transact<T>(cellId: string, work: (runtime: this) => T): FrameworkResult<T> {
    const beforeHash = this.hash();
    this.store.begin(cellId);
    this.eventQueue = [];
    try {
      const value = work(this);
      this.drainEvents();
      this.checkInvariants();
      const transaction = this.store.commit();
      this.eventQueue = null;
      this.history.splice(this.cursor);
      this.history.push({
        forward: transaction.forward,
        inverse: transaction.inverse,
      });
      this.cursor = this.history.length;
      return { ok: true, value, commit: { cellId, transaction } };
    } catch (error) {
      this.eventQueue = null;
      if (this.store.transactionOpen) this.store.rollback();
      return {
        ok: false,
        failure: {
          cellId,
          code:
            error instanceof RuntimeFault
              ? error.diagnostic.code
              : "TS_RUNTIME_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Framework transaction failed",
          beforeHash,
          afterHash: this.hash(),
        },
      };
    }
  }

  undo(): boolean {
    if (this.cursor === 0) return false;
    const entry = this.history[this.cursor - 1];
    if (entry === undefined) return false;
    this.store.applyPatch(entry.inverse);
    this.cursor -= 1;
    return true;
  }

  redo(): boolean {
    const entry = this.history[this.cursor];
    if (entry === undefined) return false;
    this.store.applyPatch(entry.forward);
    this.cursor += 1;
    return true;
  }

  hash(): string {
    return this.store.hash();
  }

  state<T extends FrameworkData = FrameworkData>(key: string): T {
    const value = this.store.getProperty(this.refs.root, key);
    if (value.type === "undefined")
      throw new Error(`Unknown state field ${key}`);
    return this.fromRuntime(value) as T;
  }

  setState(key: string, value: FrameworkData): void {
    this.store.setProperty(this.refs.root, key, this.toRuntime(value));
  }

  item<T extends FrameworkData = FrameworkData>(
    registry: RegistryName,
    id: string,
  ): T | null {
    const value = this.store.getProperty(this.refs.registries[registry], id);
    return value.type === "undefined" ? null : (this.fromRuntime(value) as T);
  }

  items<T extends FrameworkData = FrameworkData>(
    registry: RegistryName,
  ): Record<string, T> {
    const object = this.object(this.refs.registries[registry]);
    if (object.kind !== "record") throw new Error("Registry must be a record");
    return Object.fromEntries(
      [...object.properties]
        .sort(([left], [right]) => compareText(left, right))
        .map(([id, value]) => [id, this.fromRuntime(value) as T]),
    );
  }

  setItem(registry: RegistryName, id: string, value: FrameworkData): void {
    if (this.item(registry, id) !== null)
      throw new Error(`Duplicate stable ID ${id}`);
    this.store.setProperty(
      this.refs.registries[registry],
      id,
      this.toRuntime(value),
    );
  }

  patchItem(
    registry: RegistryName,
    id: string,
    changes: Record<string, FrameworkData>,
  ): void {
    const reference = this.itemReference(registry, id);
    for (const [key, value] of Object.entries(changes))
      this.store.setProperty(reference, key, this.toRuntime(value));
  }

  removeItem(registry: RegistryName, id: string): void {
    this.store.deleteProperty(this.refs.registries[registry], id);
  }

  registerAction(definition: ActionDefinition): void {
    this.setItem("actions", definition.id, {
      id: definition.id,
      label: definition.label,
      actorRole: definition.actorRole,
      ui: definition.ui as unknown as FrameworkData,
    });
    this.actionDefinitions.set(definition.id, definition);
  }

  legalActions(actorId: string): LegalActionOption[] {
    const options: LegalActionOption[] = [];
    const registered = this.items("actions");
    for (const definition of [...this.actionDefinitions.values()].sort(
      (left, right) => compareText(left.id, right.id),
    )) {
      if (registered[definition.id] === undefined) continue;
      for (const candidate of definition.materialize(this, actorId)) {
        const suffix = Object.entries(candidate.parameters)
          .sort(([left], [right]) => compareText(left, right))
          .map(([key, value]) => `${key}=${value}`)
          .join("&");
        options.push({
          id: `${definition.id}:${suffix}`,
          actionId: definition.id,
          actorId,
          label: definition.label,
          parameters: candidate.parameters,
          ui: definition.ui,
        });
      }
    }
    return options.sort((left, right) => compareText(left.id, right.id));
  }

  performAction(option: LegalActionOption): FrameworkResult<void> {
    return this.transact(`action:${option.id}`, () => {
      const legal = this.legalActions(option.actorId).find(
        (candidate) => candidate.id === option.id,
      );
      if (legal === undefined)
        throw new RuntimeFault({
          code: "TS_ACTION_UNAVAILABLE",
          phase: "execute",
          message: `Action option ${option.id} is unavailable`,
        });
      const definition = this.actionDefinitions.get(legal.actionId);
      if (definition === undefined)
        throw new Error(`Unknown action ${legal.actionId}`);
      this.trace(`performAction: ${legal.actionId}`, {
        actorId: legal.actorId,
      });
      definition.perform(this, legal.actorId, legal.parameters);
    });
  }

  actionSource(option: LegalActionOption): string {
    const entries = Object.entries({
      actorId: option.actorId,
      ...option.parameters,
    })
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(", ");
    return `performAction(${JSON.stringify(option.actionId)}, { ${entries} });`;
  }

  registerScenario(definition: ScenarioDefinition): void {
    const order = this.state<number>("scenarioSequence");
    this.setItem("scenarios", definition.id, {
      id: definition.id,
      name: definition.name,
      when: definition.when,
      order,
    });
    this.setState("scenarioSequence", order + 1);
    if (!this.scenarioDefinitions.some((item) => item.id === definition.id))
      this.scenarioDefinitions.push(definition);
  }

  registerInvariant(definition: InvariantDefinition): void {
    this.setItem("invariants", definition.id, {
      id: definition.id,
      name: definition.name,
    });
    if (!this.invariantDefinitions.some((item) => item.id === definition.id))
      this.invariantDefinitions.push(definition);
  }

  emit(type: string, payload: Record<string, FrameworkData> = {}): void {
    if (this.eventQueue === null)
      throw new Error("Events require a transaction");
    this.eventQueue.push({ type, payload });
    this.trace(`emit: ${type}`);
  }

  trace(
    label: string,
    details?: Record<string, string | number | boolean | null>,
  ): void {
    this.store.trace({
      type: "framework.trace",
      label,
      ...(details === undefined ? {} : { details }),
    });
  }

  randomInt(minInclusive: number, maxExclusive: number): number {
    if (
      !Number.isInteger(minInclusive) ||
      !Number.isInteger(maxExclusive) ||
      maxExclusive <= minInclusive
    )
      throw new Error("randomInt requires a non-empty integer range");
    const current = this.state<number>("rngState");
    const next = nextRandom(current);
    this.setState("rngState", next.state);
    return (
      minInclusive + Math.floor(next.value * (maxExclusive - minInclusive))
    );
  }

  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = this.randomInt(0, index + 1);
      const held = result[index]!;
      result[index] = result[target]!;
      result[target] = held;
    }
    return result;
  }

  private drainEvents(): void {
    if (this.eventQueue === null) return;
    let steps = 0;
    while (this.eventQueue.length > 0) {
      if (steps >= this.triggerLimit)
        throw new RuntimeFault({
          code: "TS_TRIGGER_LIMIT",
          phase: "trigger",
          message: "Scenario cascade exceeded its deterministic limit",
        });
      const event = this.eventQueue.shift()!;
      const registry = this.items<{ order: number }>("scenarios");
      const definitions = this.scenarioDefinitions
        .filter((definition) => registry[definition.id] !== undefined)
        .sort((left, right) => {
          const order = registry[left.id]!.order - registry[right.id]!.order;
          return order !== 0 ? order : compareText(left.id, right.id);
        });
      for (const scenario of definitions) {
        if (!scenario.matches(this, event)) continue;
        this.trace(`scenario: ${scenario.name}`, {
          scenarioId: scenario.id,
        });
        scenario.effect(this, event);
        steps += 1;
      }
    }
  }

  private checkInvariants(): void {
    const registered = this.items("invariants");
    for (const invariant of [...this.invariantDefinitions].sort((left, right) =>
      compareText(left.id, right.id),
    )) {
      if (registered[invariant.id] === undefined) continue;
      if (invariant.check(this)) continue;
      throw new RuntimeFault({
        code: "TS_INVARIANT_FAILED",
        phase: "invariant",
        message: `Invariant failed: ${invariant.name}`,
      });
    }
  }

  private itemReference(registry: RegistryName, id: string): RuntimeValue {
    const value = this.store.getProperty(this.refs.registries[registry], id);
    if (value.type !== "object")
      throw new Error(`Unknown ${registry} item ${id}`);
    return value;
  }

  private object(value: RuntimeValue) {
    if (value.type !== "object") throw new Error("Expected runtime object");
    return this.store.getHeapObject(value.objectId);
  }

  private toRuntime(value: FrameworkData): RuntimeValue {
    if (value === null || typeof value !== "object")
      return this.store.fromHost(value);
    if (Array.isArray(value))
      return this.store.allocateArray(
        value.map((item) => this.toRuntime(item)),
      );
    return this.store.allocateRecord(
      Object.entries(value).map(([key, item]) => [key, this.toRuntime(item)]),
    );
  }

  private fromRuntime(value: RuntimeValue): FrameworkData {
    if (value.type === "undefined" || value.type === "null") return null;
    if (
      value.type === "boolean" ||
      value.type === "number" ||
      value.type === "string"
    )
      return value.value;
    if (value.type === "function" || value.type === "native-function")
      throw new Error("Framework state cannot contain callable values");
    const object = this.object(value);
    if (object.kind === "array")
      return object.items.map((item) => this.fromRuntime(item));
    return Object.fromEntries(
      [...object.properties].map(([key, item]) => [
        key,
        this.fromRuntime(item),
      ]),
    );
  }
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
