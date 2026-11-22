import { describe, expect, it } from "vitest";
import { pageCost, parseShard, shardPages } from "./a11y-shard.mjs";
import { PAGES } from "./pages.mjs";

const rendered = PAGES.filter((page) => !page.redirect);
const key = (page: (typeof PAGES)[number]) => `${page.path} ${page.signedIn} ${JSON.stringify(page.params ?? page.application ?? null)}`;
const stateKeys = (pages: typeof PAGES) => pages.flatMap((page) => (page.states ?? []).map((state) => `${key(page)} ${state.name}`));

describe("parseShard", () => {
  it("is one shard of everything when unset", () => {
    expect(parseShard(undefined)).toEqual({ index: 1, total: 1 });
    expect(parseShard("")).toEqual({ index: 1, total: 1 });
  });

  it("reads index/total", () => {
    expect(parseShard("2/3")).toEqual({ index: 2, total: 3 });
  });

  it.each(["0/2", "3/2", "1", "a/b", "1/0"])("rejects %s", (value) => {
    expect(() => parseShard(value)).toThrow("A11Y_SHARD");
  });
});

describe("shardPages", () => {
  it("checks every page with no shard set, in order", () => {
    expect(shardPages(rendered, parseShard(undefined))).toEqual(rendered);
  });

  it.each([2, 3])("covers every page and state exactly once across %i shards", (total) => {
    const shards = Array.from({ length: total }, (_, i) => shardPages(rendered, { index: i + 1, total }));
    const pages = shards.flat().map(key);
    expect(pages.toSorted()).toEqual(rendered.map(key).toSorted());
    expect(new Set(pages).size).toBe(pages.length);
    const states = shards.flatMap(stateKeys);
    expect(states.toSorted()).toEqual(stateKeys(rendered).toSorted());
    expect(new Set(states).size).toBe(states.length);
    for (const shard of shards) expect(shard.length).toBeGreaterThan(0);
  });

  it("splits the work about evenly", () => {
    const costs = [1, 2].map((index) => shardPages(rendered, { index, total: 2 }).reduce((sum, page) => sum + pageCost(page), 0));
    const biggestPage = Math.max(...rendered.map(pageCost));
    expect(Math.abs(costs[0] - costs[1])).toBeLessThanOrEqual(biggestPage);
  });
});
