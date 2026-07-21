import {
  diagnosticFromUnknown,
  type RuntimeDiagnostic,
} from "../parser/diagnostics";
import { parseCell } from "../parser/parse-cell";
import { TransactionalStore } from "../store/transactional-store";
import type { RuntimePatch, RuntimeValue } from "../store/types";
import { validateCell, type CellCapability } from "../validator/validate-cell";
import { Interpreter, type InterpreterLimits } from "./interpreter";

export interface CellSuccess {
  ok: true;
  cellId: string;
  value: RuntimeValue;
  beforeHash: string;
  afterHash: string;
  forward: RuntimePatch;
  inverse: RuntimePatch;
}

export interface CellFailure {
  ok: false;
  cellId: string;
  beforeHash: string;
  afterHash: string;
  diagnostic: RuntimeDiagnostic;
}

export type CellResult = CellSuccess | CellFailure;

interface HistoryEntry {
  source: string;
  forward: RuntimePatch;
  inverse: RuntimePatch;
}

export class RoomRuntime {
  readonly store = new TransactionalStore();
  private readonly interpreter: Interpreter;
  private readonly history: HistoryEntry[] = [];
  private cursor = 0;
  private nextCellId = 1;
  executionCount = 0;

  constructor(limits?: InterpreterLimits) {
    this.interpreter = new Interpreter(this.store, limits);
  }

  executeCell(
    source: string,
    options: {
      cellId?: string;
      capability?: CellCapability;
      recordHistory?: boolean;
    } = {},
  ): CellResult {
    const cellId = options.cellId ?? `cell:${String(this.nextCellId++)}`;
    const beforeHash = this.store.hash();
    try {
      const parsed = parseCell(source);
      validateCell(parsed.program, options.capability ?? "designer");
      this.store.begin(cellId);
      this.executionCount += 1;
      const value = this.interpreter.execute(parsed.program);
      const committed = this.store.commit();
      if (options.recordHistory !== false) {
        this.history.splice(this.cursor);
        this.history.push({
          source,
          forward: committed.forward,
          inverse: committed.inverse,
        });
        this.cursor = this.history.length;
      }
      return {
        ok: true,
        cellId,
        value,
        beforeHash,
        afterHash: this.store.hash(),
        forward: committed.forward,
        inverse: committed.inverse,
      };
    } catch (error) {
      if (this.store.transactionOpen) this.store.rollback();
      return {
        ok: false,
        cellId,
        beforeHash,
        afterHash: this.store.hash(),
        diagnostic: diagnosticFromUnknown(
          error,
          error instanceof SyntaxError ? "parse" : "execute",
        ),
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

  applyPatch(patch: RuntimePatch): void {
    this.store.applyPatch(patch);
  }

  hash(): string {
    return this.store.hash();
  }

  bindings(): Record<string, RuntimeValue> {
    return this.store.globalBindings();
  }
}
