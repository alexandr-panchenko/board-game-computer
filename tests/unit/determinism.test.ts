import { expect, test } from "vitest";

import { RoomRuntime } from "../../src/runtime";

test("two independent runtimes converge after the same ordered cells", () => {
  const cells = [
    "let value = 1; const steps = [2, 3, 4];",
    "for (const step of steps) { value += step; }",
    "const result = { value: value, label: `state-${value}` };",
  ];
  const first = new RoomRuntime();
  const second = new RoomRuntime();
  for (const cell of cells) {
    expect(first.executeCell(cell).ok).toBe(true);
    expect(second.executeCell(cell).ok).toBe(true);
  }
  expect(first.hash()).toBe(second.hash());
});
