import { describe, expect, it } from "vitest";

import { FrameworkRuntime, Scenario } from "../../../src/runtime";
import { PrismFoundryRoom } from "../../../src/sample";

describe("table framework", () => {
  it("creates stable registries and deterministic PRNG state", () => {
    const first = new FrameworkRuntime("same-seed");
    const second = new FrameworkRuntime("same-seed");
    const firstSetup = first.transact("setup", (runtime) => {
      runtime.setItem("zones", "zone-a", { id: "zone-a", tags: ["room"] });
      return runtime.shuffle([1, 2, 3, 4]);
    });
    const secondSetup = second.transact("setup", (runtime) => {
      runtime.setItem("zones", "zone-a", { id: "zone-a", tags: ["room"] });
      return runtime.shuffle([1, 2, 3, 4]);
    });

    expect(firstSetup.ok).toBe(true);
    expect(secondSetup.ok).toBe(true);
    if (!firstSetup.ok || !secondSetup.ok) return;
    expect(firstSetup.value).toEqual(secondSetup.value);
    expect(first.hash()).toBe(second.hash());
  });

  it("runs FIFO scenarios in registration order", () => {
    const runtime = new FrameworkRuntime("events");
    const setup = runtime.transact("setup", () => {
      runtime.setState("order", []);
      for (const id of ["first", "second"]) {
        runtime.registerScenario({
          id,
          name: id,
          when: "after",
          matches: (_view, event) => event.type === "start",
          effect: (mutation) => {
            const order = mutation.state<string[]>("order");
            mutation.setState("order", [...order, id]);
          },
        });
      }
    });
    expect(setup.ok).toBe(true);

    const result = runtime.transact("emit", () => runtime.emit("start"));
    expect(result.ok).toBe(true);
    expect(runtime.state("order")).toEqual(["first", "second"]);
  });

  it("caps trigger cascades and restores the exact pre-event hash", () => {
    const runtime = new FrameworkRuntime("cascade", 3);
    const setup = runtime.transact("setup", () => {
      runtime.registerScenario({
        id: "loop",
        name: "Looping scenario",
        when: "after",
        matches: (_view, event) => event.type === "loop",
        effect: (mutation) => mutation.emit("loop"),
      });
    });
    expect(setup.ok).toBe(true);
    const before = runtime.hash();
    const result = runtime.transact("loop", () => runtime.emit("loop"));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe("TS_TRIGGER_LIMIT");
    expect(result.failure.afterHash).toBe(before);
  });

  it("requires exactly one Given, When, and Then in a Scenario builder", () => {
    const runtime = new FrameworkRuntime("bdd");
    const before = runtime.hash();
    const rejected = runtime.transact("incomplete-scenario", () => {
      Scenario(
        runtime,
        { id: "incomplete", name: "Incomplete" },
        ({ Given, When }) => {
          Given(() => true);
          When("after");
        },
      );
    });
    expect(rejected.ok).toBe(false);
    expect(runtime.hash()).toBe(before);
  });

  it("rolls back invariant failures and random allocation exactly", () => {
    const runtime = new FrameworkRuntime("rollback-random");
    const setup = runtime.transact("setup", () => {
      runtime.setState("score", 1);
      runtime.registerInvariant({
        id: "score-positive",
        name: "Score stays positive",
        check: (view) => view.state<number>("score") > 0,
      });
    });
    expect(setup.ok).toBe(true);
    const before = runtime.hash();

    const rejected = runtime.transact("bad", () => {
      runtime.randomInt(0, 100);
      runtime.setItem("entities", "temporary", { id: "temporary" });
      runtime.setState("score", -1);
    });

    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.failure.code).toBe("TS_INVARIANT_FAILED");
    expect(rejected.failure.beforeHash).toBe(before);
    expect(rejected.failure.afterHash).toBe(before);
    expect(runtime.item("entities", "temporary")).toBeNull();
  });

  it("materializes one canonical legal-action path for human and AI", () => {
    const game = new PrismFoundryRoom();
    const option = game
      .legalActions("human")
      .find((candidate) => candidate.actionId === "take-crystals");
    expect(option).toBeDefined();
    expect(game.actionSource(option!)).toMatch(
      /^performAction\("take-crystals", \{ actorId: "human", first:/,
    );
    const result = game.perform(option!);
    expect(result.ok).toBe(true);
    expect(game.snapshot().activePlayerId).toBe("ai");
  });
});
