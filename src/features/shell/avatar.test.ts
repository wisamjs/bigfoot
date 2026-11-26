import { describe, expect, it } from "vitest";
import { initials } from "./avatar";

describe("initials", () => {
  it.each([
    ["Wisam Zaghal", "WZ"],
    ["Cher", "C"],
    ["  mary  ann   smith ", "MS"],
    ["", "?"],
    ["   ", "?"],
  ])("writes %j as %j", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
