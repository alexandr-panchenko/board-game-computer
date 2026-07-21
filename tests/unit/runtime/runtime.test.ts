import { describe, expect, it } from "vitest";

import { RoomRuntime } from "../../../src/runtime";
import { parseCell } from "../../../src/runtime/parser/parse-cell";
import type { RuntimeValue } from "../../../src/runtime/store/types";
import { validateCell } from "../../../src/runtime/validator/validate-cell";

function execute(runtime: RoomRuntime, source: string) {
  const result = runtime.executeCell(source);
  if (!result.ok)
    throw new Error(`${result.diagnostic.code}: ${result.diagnostic.message}`);
  return result;
}

function materialize(runtime: RoomRuntime, value: RuntimeValue): unknown {
  if (value.type === "undefined") return undefined;
  if (value.type === "null") return null;
  if (
    value.type === "boolean" ||
    value.type === "number" ||
    value.type === "string"
  )
    return value.value;
  if (value.type === "function" || value.type === "native-function")
    return value;
  const object = runtime.store.getHeapObject(value.objectId);
  if (object.kind === "array")
    return object.items.map((item) => materialize(runtime, item));
  return Object.fromEntries(
    [...object.properties].map(([key, item]) => [
      key,
      materialize(runtime, item),
    ]),
  );
}

describe("reversible runtime", () => {
  it("executes scopes, finite loops, records, arrays, functions, and closures", () => {
    const runtime = new RoomRuntime();
    execute(
      runtime,
      `
        let total = 0;
        const values = [1, 2, 3, 4];
        for (const value of values) {
          if (value === 2) continue;
          total += value;
          if (total > 5) break;
        }
        function makeCounter(start) {
          let current = start;
          return () => {
            current += 1;
            return current;
          };
        }
        const next = makeCounter(total);
        const first = next();
        const second = next();
        const summary = { total: total, results: [first, second] };
      `,
    );

    expect(materialize(runtime, runtime.bindings().summary!)).toEqual({
      total: 8,
      results: [9, 10],
    });
  });

  it("rolls back slots, allocations, heap writes, and allocators on failure", () => {
    const runtime = new RoomRuntime();
    execute(runtime, "let base = 1;");
    const before = runtime.hash();

    const failed = runtime.executeCell(`
      base = 7;
      const temporary = [1];
      temporary.push(2);
      assert(false, "rollback");
    `);

    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.diagnostic.code).toBe("TS_ASSERTION_FAILED");
    expect(failed.beforeHash).toBe(before);
    expect(failed.afterHash).toBe(before);
    expect(materialize(runtime, runtime.bindings().base!)).toBe(1);

    const retry = execute(runtime, "const temporary = [1];");
    expect(retry.beforeHash).toBe(before);
  });

  it("undoes and redoes an exact committed patch", () => {
    const runtime = new RoomRuntime();
    execute(runtime, "let score = 1;");
    const before = runtime.hash();
    const changed = execute(runtime, "score += 4;");

    expect(runtime.undo()).toBe(true);
    expect(runtime.hash()).toBe(before);
    expect(materialize(runtime, runtime.bindings().score!)).toBe(1);
    expect(runtime.redo()).toBe(true);
    expect(runtime.hash()).toBe(changed.afterHash);
    expect(materialize(runtime, runtime.bindings().score!)).toBe(5);
  });

  it("evaluates compound assignment references once and before the right side", () => {
    const runtime = new RoomRuntime();
    execute(
      runtime,
      `
        let index = 0;
        const values = [1, 2];
        values[index++] += (values[0] = 4);
        const observed = [index, values[0]];
      `,
    );

    expect(materialize(runtime, runtime.bindings().observed!)).toEqual([1, 5]);
  });

  it("reversibly deletes record fields and splices arrays", () => {
    const runtime = new RoomRuntime();
    execute(
      runtime,
      `
        const record = { keep: 1, remove: 2 };
        const removedField = delete record.remove;
        const values = [1, 2, 3, 4];
        const removedItems = values.splice(1, 2, 8, 9);
      `,
    );
    expect(materialize(runtime, runtime.bindings().record!)).toEqual({
      keep: 1,
    });
    expect(materialize(runtime, runtime.bindings().removedField!)).toBe(true);
    expect(materialize(runtime, runtime.bindings().values!)).toEqual([
      1, 8, 9, 4,
    ]);
    expect(materialize(runtime, runtime.bindings().removedItems!)).toEqual([
      2, 3,
    ]);
    expect(runtime.undo()).toBe(true);
    expect(runtime.bindings().record).toBeUndefined();
  });

  it("produces source-located validation diagnostics", () => {
    const runtime = new RoomRuntime();
    const unsupported = runtime.executeCell("while (true) {};");
    expect(unsupported.ok).toBe(false);
    if (unsupported.ok) return;
    expect(unsupported.diagnostic).toMatchObject({
      code: "TS_UNSUPPORTED_NODE",
      phase: "validate",
      line: 1,
    });

    expect(() =>
      validateCell(parseCell("let x = 1;").program, "player"),
    ).toThrow(/performAction/);
    expect(() =>
      validateCell(
        parseCell('performAction("move", { actorId: "human" });').program,
        "player",
      ),
    ).not.toThrow();
  });

  it("rejects visible recursion and fuel-bounds dynamic cycles", () => {
    const direct = new RoomRuntime().executeCell(
      "function loop() { return loop(); } loop();",
    );
    expect(direct.ok).toBe(false);
    if (direct.ok) return;
    expect(direct.diagnostic.code).toBe("TS_UNSUPPORTED_RECURSION");

    const runtime = new RoomRuntime({
      fuel: 80,
      maxCallDepth: 100,
      maxCollectionSize: 100,
      maxHeapObjects: 100,
    });
    const dynamic = runtime.executeCell(`
      const box = { fn: null };
      function cycle() { return box.fn(); }
      box.fn = cycle;
      cycle();
    `);
    expect(dynamic.ok).toBe(false);
    if (dynamic.ok) return;
    expect(dynamic.diagnostic.code).toBe("TS_FUEL_EXHAUSTED");
    expect(dynamic.beforeHash).toBe(dynamic.afterHash);
  });

  it("bounds heap allocation and rolls back the rejected cell", () => {
    const runtime = new RoomRuntime({
      fuel: 100,
      maxCallDepth: 10,
      maxCollectionSize: 10,
      maxHeapObjects: 1,
    });
    execute(runtime, "const retained = [];");
    const before = runtime.hash();
    const rejected = runtime.executeCell("const rejected = {};");

    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.diagnostic.code).toBe("TS_HEAP_LIMIT");
    expect(rejected.afterHash).toBe(before);
  });

  it("converges independent runtimes to one canonical state hash", () => {
    const sources = [
      "let score = 0; const bag = [1, 2, 3];",
      "for (const value of bag) { score += value; }",
      "function add(value) { score += value; return score; } const final = add(4);",
    ];
    const first = new RoomRuntime();
    const second = new RoomRuntime();
    for (const source of sources) {
      execute(first, source);
      execute(second, source);
    }
    expect(first.hash()).toBe(second.hash());
    expect(materialize(first, first.bindings().final!)).toBe(10);
  });

  it("replays a synthetic 500-cell room within the provisional desktop budget", () => {
    const runtime = new RoomRuntime();
    execute(runtime, "let counter = 0;");
    const started = performance.now();
    for (let index = 0; index < 500; index += 1)
      execute(runtime, "counter += 1;");
    const elapsed = performance.now() - started;

    expect(materialize(runtime, runtime.bindings().counter!)).toBe(500);
    expect(elapsed).toBeLessThan(3_000);
  });
});
