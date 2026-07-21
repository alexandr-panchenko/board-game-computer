import { expect, test } from "vitest";

import { RoomRuntime } from "../../src/runtime";

test("rollback restores the exact hash after heap and slot mutations", () => {
  const runtime = new RoomRuntime();
  const setup = runtime.executeCell("let score = 2; const cards = [1, 2];");
  expect(setup.ok).toBe(true);
  const before = runtime.hash();

  const failed = runtime.executeCell(
    'score += 3; cards.push(4); assert(false, "atomic");',
  );
  expect(failed.ok).toBe(false);
  expect(runtime.hash()).toBe(before);
});
