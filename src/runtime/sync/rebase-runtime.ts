import type { CellFailure, CellSuccess } from "../interpreter/room-runtime";
import { RoomRuntime } from "../interpreter/room-runtime";
import type { RuntimePatch } from "../store/types";

interface PendingCell {
  commandId: string;
  source: string;
  forward: RuntimePatch;
  inverse: RuntimePatch;
  inFlight: boolean;
}

export interface RebaseResult {
  authoritative: CellSuccess;
  reapplied: string[];
  conflicts: Array<{ commandId: string; failure: CellFailure }>;
}

export class RebaseRuntime {
  readonly runtime = new RoomRuntime();
  private pending: PendingCell[] = [];

  propose(commandId: string, source: string): CellSuccess | CellFailure {
    const result = this.runtime.executeCell(source, {
      cellId: commandId,
      recordHistory: false,
    });
    if (!result.ok) return result;
    this.pending.push({
      commandId,
      source,
      forward: result.forward,
      inverse: result.inverse,
      inFlight: this.pending.length === 0,
    });
    return result;
  }

  accept(commandId: string): void {
    const first = this.pending[0];
    if (first?.commandId !== commandId || !first.inFlight)
      throw new Error("Only the oldest in-flight proposal can commit");
    this.pending.shift();
    if (this.pending[0] !== undefined) this.pending[0].inFlight = true;
  }

  receiveAuthoritative(commandId: string, source: string): RebaseResult {
    for (const pending of [...this.pending].reverse())
      this.runtime.applyPatch(pending.inverse);

    const authoritative = this.runtime.executeCell(source, {
      cellId: commandId,
      recordHistory: false,
    });
    if (!authoritative.ok)
      throw new Error(
        `Authoritative cell failed: ${authoritative.diagnostic.message}`,
      );

    const previous = this.pending;
    this.pending = [];
    const reapplied: string[] = [];
    const conflicts: Array<{ commandId: string; failure: CellFailure }> = [];
    for (const pending of previous) {
      const result = this.runtime.executeCell(pending.source, {
        cellId: pending.commandId,
        recordHistory: false,
      });
      if (!result.ok) {
        conflicts.push({ commandId: pending.commandId, failure: result });
        continue;
      }
      this.pending.push({
        commandId: pending.commandId,
        source: pending.source,
        forward: result.forward,
        inverse: result.inverse,
        inFlight: this.pending.length === 0,
      });
      reapplied.push(pending.commandId);
    }
    return { authoritative, reapplied, conflicts };
  }

  pendingState(): ReadonlyArray<{ commandId: string; inFlight: boolean }> {
    return this.pending.map(({ commandId, inFlight }) => ({
      commandId,
      inFlight,
    }));
  }
}
