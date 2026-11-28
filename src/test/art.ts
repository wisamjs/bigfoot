import { expect } from "storybook/test";

// Checks for a decorative Bigfoot in a story's play function (BIG-232): shown, with an empty alt,
// clear of every word and control on the page, and inside its width.

const overlaps = (a: DOMRect, b: DOMRect) =>
  a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;

/** The first words of each visible text on the page that `box` covers. */
function coveredText(doc: Document, box: DOMRect) {
  const found: string[] = [];
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (!text || !node.parentElement?.checkVisibility()) continue;
    const range = doc.createRange();
    range.selectNodeContents(node);
    if ([...range.getClientRects()].some((line) => overlaps(box, line))) found.push(`text "${text.slice(0, 40)}"`);
  }
  return found;
}

/** The names of the visible controls on the page that `box` covers. */
function coveredControls(doc: Document, box: DOMRect) {
  return [...doc.querySelectorAll<HTMLElement>("a, button, input, textarea, select")]
    .filter((control) => control.checkVisibility() && overlaps(box, control.getBoundingClientRect()))
    .map((control) => `control "${(control.textContent || control.getAttribute("aria-label") || control.tagName).trim()}"`);
}

/** What on the page `art`'s box covers: visible text and controls. */
function covered(art: HTMLElement) {
  const box = art.getBoundingClientRect();
  return [...coveredText(art.ownerDocument, box), ...coveredControls(art.ownerDocument, box)];
}

/** The `sprite` Bigfoot (part of its file name) is shown, decorative, clear of text and controls, and inside the page's width, so it never scrolls the page sideways. */
export async function expectBigfootClear(canvasElement: HTMLElement, sprite: string) {
  const art = canvasElement.querySelector<HTMLImageElement>(`img[src*="${sprite}"]`);
  await expect(art).toBeVisible();
  await expect(art).toHaveAttribute("alt", "");
  await expect(covered(art!)).toEqual([]);
  const box = art!.getBoundingClientRect();
  await expect(box.left).toBeGreaterThanOrEqual(0);
  await expect(box.right).toBeLessThanOrEqual(canvasElement.ownerDocument.documentElement.clientWidth + 0.5);
}
