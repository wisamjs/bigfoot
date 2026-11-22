// Splits scripts/a11y.mjs's pages into shards, so CI can check them on parallel runners.
// A11Y_SHARD=1/2 checks the first of two shards; unset, one shard holds every page.
// Pages are split, not colour schemes: reflow, the phone and dialog keyboard checks run on the
// first scheme only, so a light/dark split would be lopsided. A page's `states` stay with it.

/**
 * The shard A11Y_SHARD names, as { index, total } with index from 1; every page when unset.
 * @param {string | undefined} value
 */
export function parseShard(value) {
  if (!value?.trim()) return { index: 1, total: 1 };
  const match = /^(\d+)\/(\d+)$/.exec(value.trim());
  const index = Number(match?.[1]);
  const total = Number(match?.[2]);
  if (!match || total < 1 || index < 1 || index > total) {
    throw new Error(`A11Y_SHARD must look like 1/2 (shard 1 of 2), not "${value}"`);
  }
  return { index, total };
}

/**
 * Roughly how long a page takes to check, in page loads: the page in each scheme, at 320px and on a
 * phone; each state in each scheme and on a phone.
 * @param {{ states?: unknown[] }} page
 */
export function pageCost(page) {
  return 4 + 3 * (page.states?.length ?? 0);
}

/**
 * The pages in shard `index` of `total`: each page goes to the shard with the least work so far,
 * costliest page first, so the shards take about as long. Keeps the pages' own order.
 * @template {{ states?: unknown[] }} P
 * @param {P[]} pages
 * @param {{ index: number, total: number }} shard
 * @returns {P[]}
 */
export function shardPages(pages, { index, total }) {
  const load = Array.from({ length: total }, () => 0);
  const owner = new Map();
  const byCost = pages.map((page, i) => ({ page, i })).sort((a, b) => pageCost(b.page) - pageCost(a.page) || a.i - b.i);
  for (const { page, i } of byCost) {
    const lightest = load.indexOf(Math.min(...load));
    load[lightest] += pageCost(page);
    owner.set(i, lightest + 1);
  }
  return pages.filter((_, i) => owner.get(i) === index);
}

// A deliberate misspelling to show CI going red early: behavior.
