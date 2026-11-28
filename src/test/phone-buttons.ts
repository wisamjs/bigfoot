import { expect, within } from "storybook/test";

/** The visible link named `name` in `region`: a card can also hold one hidden on this width. */
export function visibleLink(region: HTMLElement, name: string) {
  const link = within(region).getAllByRole("link", { name }).find((l) => l.checkVisibility());
  if (!link) throw new Error(`No visible link named "${name}"`);
  return link;
}

/** Every button keeps a 44 px touch target, and its label fits it: no overflow, no wrap. */
export async function expectLabelsFit(buttons: HTMLElement[]) {
  await expect(buttons.filter((button) => button.scrollWidth > button.clientWidth)).toEqual([]);
  await expect(buttons.filter((button) => button.getBoundingClientRect().height < 44)).toEqual([]);
}

/**
 * On a phone, a card's buttons share one row, splitting it equally (CODING_STANDARDS.md, "Buttons
 * follow importance", BIG-254): the two named links sit side by side, the same width, together
 * filling their row, with labels that fit.
 */
export async function expectButtonsShareARow(region: HTMLElement, [first, second]: [string, string]) {
  const buttons = [visibleLink(region, first), visibleLink(region, second)];
  const [a, b] = buttons.map((button) => button.getBoundingClientRect());
  const row = buttons[0].parentElement!.getBoundingClientRect();
  await expect(Math.abs(a.top - b.top)).toBeLessThan(1);
  await expect(Math.abs(a.width - b.width)).toBeLessThan(1);
  await expect(b.right - a.left).toBeGreaterThan(row.width - 1);
  await expectLabelsFit(buttons);
}
