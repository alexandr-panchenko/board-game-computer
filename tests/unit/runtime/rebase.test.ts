import { describe, expect, it } from "vitest";

import { RebaseRuntime, RoomRuntime } from "../../../src/runtime";

function succeed<T extends { ok: boolean }>(
  result: T,
): asserts result is T & { ok: true } {
  expect(result.ok).toBe(true);
}

describe("pending-tail rebase", () => {
  it("undoes only pending A, applies authoritative B, and re-executes A", () => {
    const sync = new RebaseRuntime();
    succeed(
      sync.runtime.executeCell("let score = 0; let remote = 0;", {
        recordHistory: false,
      }),
    );
    succeed(sync.propose("A", "score += 2;"));
    const executionsBefore = sync.runtime.executionCount;

    const result = sync.receiveAuthoritative("B", "remote += 1;");
    expect(result.reapplied).toEqual(["A"]);
    expect(result.conflicts).toEqual([]);
    expect(sync.runtime.executionCount - executionsBefore).toBe(2);

    const fresh = new RoomRuntime();
    succeed(
      fresh.executeCell("let score = 0; let remote = 0;", {
        recordHistory: false,
      }),
    );
    succeed(fresh.executeCell("remote += 1;", { recordHistory: false }));
    succeed(fresh.executeCell("score += 2;", { recordHistory: false }));
    expect(sync.runtime.hash()).toBe(fresh.hash());
  });

  it("keeps at most one canonical proposal in flight", () => {
    const sync = new RebaseRuntime();
    succeed(
      sync.runtime.executeCell("let value = 0;", { recordHistory: false }),
    );
    succeed(sync.propose("A", "value += 1;"));
    succeed(sync.propose("B", "value += 1;"));
    expect(sync.pendingState()).toEqual([
      { commandId: "A", inFlight: true },
      { commandId: "B", inFlight: false },
    ]);
    sync.accept("A");
    expect(sync.pendingState()).toEqual([{ commandId: "B", inFlight: true }]);
  });

  it("removes a pending cell that conflicts after authoritative change", () => {
    const sync = new RebaseRuntime();
    succeed(
      sync.runtime.executeCell("let value = 8; let divisor = 2;", {
        recordHistory: false,
      }),
    );
    succeed(sync.propose("A", "value /= divisor;"));
    const result = sync.receiveAuthoritative("B", "divisor = 0;");

    expect(result.reapplied).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.failure.diagnostic.message).toMatch(
      /Non-finite/,
    );
    expect(sync.pendingState()).toEqual([]);
  });

  it("rebases three pending cells without replaying committed history", () => {
    const sync = new RebaseRuntime();
    succeed(
      sync.runtime.executeCell("let value = 0; let remote = 0;", {
        recordHistory: false,
      }),
    );
    sync.initializeConfirmed(7, sync.runtime.hash());
    succeed(sync.propose("A", "value += 1;"));
    succeed(sync.propose("B", "value += 2;"));
    succeed(sync.propose("C", "value += 3;"));
    const executionsBefore = sync.runtime.executionCount;

    const result = sync.receiveAuthoritative(
      "remote",
      "remote += 1;",
      8,
      "server-attestation",
    );
    expect(result.reapplied).toEqual(["A", "B", "C"]);
    expect(sync.runtime.executionCount - executionsBefore).toBe(4);
    expect(sync.nextProposal()).toEqual({
      commandId: "A",
      source: "value += 1;",
      baseSeq: 8,
      baseStateHash: "server-attestation",
    });
  });

  it("moves through loaded history using patches and returns live", () => {
    const sync = new RebaseRuntime();
    succeed(
      sync.runtime.executeCell("let value = 0;", { recordHistory: false }),
    );
    sync.initializeConfirmed(0, sync.runtime.hash());
    succeed(sync.propose("A", "value += 1;"));
    sync.accept("A", 1, sync.runtime.hash());
    succeed(sync.propose("B", "value += 2;"));
    sync.accept("B", 2, sync.runtime.hash());
    const liveHash = sync.runtime.hash();

    expect(sync.previous()).toBe(true);
    expect(sync.timelineState()).toMatchObject({
      cursor: 1,
      length: 2,
      live: false,
    });
    expect(sync.previous()).toBe(true);
    expect(sync.next()).toBe(true);
    sync.returnLive();
    expect(sync.runtime.hash()).toBe(liveHash);
    expect(sync.timelineState()).toMatchObject({
      cursor: 2,
      length: 2,
      live: true,
    });
  });
});
