import { describe, expect, it } from "vitest";
import { deletedApplicationsText } from "./account-text";

describe("deletedApplicationsText", () => {
  it.each([
    [undefined, "all of your Applications"],
    [0, "all 0 of your Applications"],
    [1, "your 1 Application"],
    [4, "all 4 of your Applications"],
  ])("says %s Applications as %j", (count, expected) => {
    expect(deletedApplicationsText(count)).toBe(expected);
  });
});
