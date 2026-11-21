import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("cspell.json lists its words in case-insensitive order, so adding one moves no other", () => {
  const { words } = JSON.parse(readFileSync("cspell.json", "utf8")) as { words: string[] };
  const key = (word: string) => word.toLowerCase();
  const sorted = words.toSorted((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  expect(words).toEqual(sorted);
});
