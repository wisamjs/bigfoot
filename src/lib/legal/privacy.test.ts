import { describe, expect, it } from "vitest";
import { formatPolicyDate, PRIVACY_CHANGES, PRIVACY_EFFECTIVE_DATE } from "./privacy";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("Privacy Policy versioning", () => {
  it("takes effect on the date of the newest change", () => {
    expect(PRIVACY_EFFECTIVE_DATE).toBe(PRIVACY_CHANGES[0].date);
  });

  it("lists changes newest first, one per date, as real yyyy-mm-dd dates", () => {
    const dates = PRIVACY_CHANGES.map((c) => c.date);
    for (const date of dates) {
      expect(date).toMatch(ISO_DATE);
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(date);
    }
    expect(dates).toEqual([...new Set(dates)].toSorted().toReversed());
  });

  it("formats dates without shifting them by time zone", () => {
    expect(formatPolicyDate("2026-11-11")).toBe("November 11, 2026");
    expect(formatPolicyDate("2027-01-01")).toBe("January 1, 2027");
  });
});
