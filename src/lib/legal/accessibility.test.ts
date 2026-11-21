import { describe, expect, it } from "vitest";
import { ACCESSIBILITY_CHANGES, ACCESSIBILITY_EFFECTIVE_DATE } from "./accessibility";

describe("accessibility statement versioning", () => {
  it("takes effect on the date of the newest change", () => {
    expect(ACCESSIBILITY_EFFECTIVE_DATE).toBe(ACCESSIBILITY_CHANGES[0].date);
  });

  it("lists changes newest first, one per date, as real yyyy-mm-dd dates", () => {
    const dates = ACCESSIBILITY_CHANGES.map((c) => c.date);
    for (const date of dates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
    }
    expect(dates).toEqual([...new Set(dates)].toSorted().toReversed());
  });
});
