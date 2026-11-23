import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import axe from "axe-core";
import { afterEach } from "vitest";

// The same rule tags as scripts/a11y.mjs, minus rules that need a whole page or a real layout:
// a component isn't a page (landmarks, h1, title, lang), and happy-dom computes no colours or
// sizes (contrast, target size). `npm run a11y` checks those in Chrome.
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa", "best-practice"];
const PAGE_ONLY_RULES = [
  "bypass",
  "color-contrast",
  "document-title",
  "html-has-lang",
  "landmark-one-main",
  "page-has-heading-one",
  "region",
  "target-size",
];

/** One line per element that breaks an axe rule in what the test left on screen. */
export async function axeViolations(root: Element = document.body) {
  const { violations } = await axe.run(root, {
    runOnly: { type: "tag", values: AXE_TAGS },
    rules: Object.fromEntries(PAGE_ONLY_RULES.map((id) => [id, { enabled: false }])),
  });
  return violations.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(" ")}: ${v.help}`));
}

// Node 25 and later define a `localStorage` of their own, missing unless Node is given a file for
// it, which hides happy-dom's. Component tests get an in-memory one, cleared after each test.
if (typeof document !== "undefined" && !globalThis.localStorage) {
  const items = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  afterEach(() => storage.clear());
}

// Every component test is an accessibility test too: whatever it rendered must pass axe, so a
// test fails on any violation without having to ask. Vitest globals are off, so Testing Library
// can't register its own cleanup; it runs here, after axe has looked.
afterEach(async () => {
  try {
    const found = document.body.childElementCount ? await axeViolations() : [];
    if (found.length) throw new Error(`Accessibility violations:\n  ${found.join("\n  ")}`);
  } finally {
    cleanup();
  }
});
