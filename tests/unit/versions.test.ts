import { describe, expect, it } from "vitest";

import {
  APP_NAME,
  FRAMEWORK_VERSION,
  LANGUAGE_VERSION,
} from "../../src/shared/versions";

describe("version contract", () => {
  it("pins the product, language, and framework identities", () => {
    expect(APP_NAME).toBe("Board Game Computer");
    expect(LANGUAGE_VERSION).toBe("board-game-computer-js-0.1");
    expect(FRAMEWORK_VERSION).toBe("board-game-computer-framework-0.1");
  });
});
