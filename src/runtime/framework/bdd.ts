import type { FrameworkRuntime } from "./framework-runtime";
import type {
  FrameworkEvent,
  FrameworkRuntimeMutation,
  FrameworkRuntimeView,
  InvariantDefinition,
} from "./types";

type GivenPredicate = (
  runtime: FrameworkRuntimeView,
  event: FrameworkEvent,
) => boolean;
type ThenEffect = (
  runtime: FrameworkRuntimeMutation,
  event: FrameworkEvent,
) => void;

export interface ScenarioBuilder {
  Given: (predicate: GivenPredicate) => void;
  When: (timing: "after") => void;
  Then: (effect: ThenEffect) => void;
}

export function Scenario(
  runtime: FrameworkRuntime,
  definition: { id: string; name: string },
  configure: (builder: ScenarioBuilder) => void,
): void {
  let given: GivenPredicate | null = null;
  let when: "after" | null = null;
  let then: ThenEffect | null = null;
  configure({
    Given: (predicate) => {
      if (given !== null)
        throw new Error("Scenario requires exactly one Given");
      given = predicate;
    },
    When: (timing) => {
      if (when !== null) throw new Error("Scenario requires exactly one When");
      when = timing;
    },
    Then: (effect) => {
      if (then !== null) throw new Error("Scenario requires exactly one Then");
      then = effect;
    },
  });
  if (given === null || when === null || then === null)
    throw new Error("Scenario requires one Given, When, and Then");
  runtime.registerScenario({
    ...definition,
    when,
    matches: given,
    effect: then,
  });
}

export function Invariant(
  runtime: FrameworkRuntime,
  definition: InvariantDefinition,
): void {
  runtime.registerInvariant(definition);
}
