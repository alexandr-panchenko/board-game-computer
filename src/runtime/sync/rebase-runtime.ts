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

interface CommittedPatch {
  commandId: string;
  forward: RuntimePatch;
  inverse: RuntimePatch;
}

export interface RebaseResult {
  authoritative: CellSuccess;
  reapplied: string[];
  conflicts: Array<{ commandId: string; failure: CellFailure }>;
}

export class RebaseRuntime {
  readonly runtime = new RoomRuntime();
  private pending: PendingCell[] = [];
  private committed: CommittedPatch[] = [];
  private timelineCursor = 0;
  private confirmedSeq = 0;
  private confirmedHash = "uninitialized";

  initializeConfirmed(seq = 0, stateHash = this.runtime.hash()): void {
    if (this.pending.length > 0)
      throw new Error("Cannot initialize confirmed state with pending cells");
    this.confirmedSeq = seq;
    this.confirmedHash = stateHash;
  }

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

  accept(
    commandId: string,
    seq = this.confirmedSeq + 1,
    stateHash?: string,
  ): void {
    const first = this.pending[0];
    if (first?.commandId !== commandId || !first.inFlight)
      throw new Error("Only the oldest in-flight proposal can commit");
    this.pending.shift();
    this.recordCommitted({
      commandId: first.commandId,
      forward: first.forward,
      inverse: first.inverse,
    });
    this.confirmedSeq = seq;
    this.confirmedHash = stateHash ?? this.hashWithoutPending();
    if (this.pending[0] !== undefined) this.pending[0].inFlight = true;
  }

  receiveAuthoritative(
    commandId: string,
    source: string,
    seq = this.confirmedSeq + 1,
    stateHash?: string,
  ): RebaseResult {
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

    this.recordCommitted({
      commandId,
      forward: authoritative.forward,
      inverse: authoritative.inverse,
    });
    this.confirmedSeq = seq;
    this.confirmedHash = stateHash ?? this.runtime.hash();

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

  nextProposal():
    | {
        commandId: string;
        source: string;
        baseSeq: number;
        baseStateHash: string;
      }
    | undefined {
    const first = this.pending[0];
    if (first === undefined || !first.inFlight) return undefined;
    return {
      commandId: first.commandId,
      source: first.source,
      baseSeq: this.confirmedSeq,
      baseStateHash: this.confirmedHash,
    };
  }

  previous(): boolean {
    if (this.pending.length > 0 || this.timelineCursor === 0) return false;
    const entry = this.committed[this.timelineCursor - 1];
    if (entry === undefined) return false;
    this.runtime.applyPatch(entry.inverse);
    this.timelineCursor -= 1;
    return true;
  }

  next(): boolean {
    if (this.pending.length > 0 || this.timelineCursor >= this.committed.length)
      return false;
    const entry = this.committed[this.timelineCursor];
    if (entry === undefined) return false;
    this.runtime.applyPatch(entry.forward);
    this.timelineCursor += 1;
    return true;
  }

  returnLive(): void {
    while (this.next()) {
      // Patches make returning to live independent of source replay.
    }
  }

  timelineState(): {
    cursor: number;
    length: number;
    live: boolean;
    confirmedSeq: number;
    confirmedHash: string;
  } {
    return {
      cursor: this.timelineCursor,
      length: this.committed.length,
      live: this.timelineCursor === this.committed.length,
      confirmedSeq: this.confirmedSeq,
      confirmedHash: this.confirmedHash,
    };
  }

  private recordCommitted(entry: CommittedPatch): void {
    if (this.timelineCursor !== this.committed.length)
      throw new Error("Return to live before applying authoritative cells");
    this.committed.push(entry);
    this.timelineCursor = this.committed.length;
  }

  private hashWithoutPending(): string {
    for (const pending of [...this.pending].reverse())
      this.runtime.applyPatch(pending.inverse);
    const hash = this.runtime.hash();
    for (const pending of this.pending)
      this.runtime.applyPatch(pending.forward);
    return hash;
  }
}
