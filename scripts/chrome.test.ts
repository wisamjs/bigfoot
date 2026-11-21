import { describe, expect, it } from "vitest";
import { seenText } from "./chrome.mjs";

describe("seenText", () => {
  it("quotes the page's text on one line", () => {
    expect(seenText("Application error\n\n  Digest: 123 ")).toBe('"Application error Digest: 123"');
  });

  it("cuts long text short", () => {
    expect(seenText("a".repeat(400))).toBe(`"${"a".repeat(300)}…"`);
  });

  it("says when the page showed nothing", () => {
    expect(seenText(" \n")).toBe("nothing");
    expect(seenText(undefined)).toBe("nothing");
  });
});
