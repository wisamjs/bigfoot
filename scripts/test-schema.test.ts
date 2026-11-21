import { describe, expect, it } from "vitest";
import { testSchemaName } from "./test-schema.mjs";

describe("testSchemaName", () => {
  it("gives each BIG ticket branch its own schema", () => {
    expect(testSchemaName("wisamzaghal/big-104-turn-the-retro-into-checks", {})).toBe("bigfoot_test_big104");
  });

  it("uses the shared schema on any other branch", () => {
    expect(testSchemaName("main", {})).toBe("bigfoot_test");
    expect(testSchemaName("", {})).toBe("bigfoot_test");
  });

  it("uses TEST_SCHEMA when it is set, as in CI", () => {
    expect(testSchemaName("wisamzaghal/big-104-x", { TEST_SCHEMA: "bigfoot_test_42_1" })).toBe("bigfoot_test_42_1");
  });
});
