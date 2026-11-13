import { describe, expect, it } from "vitest";
import { dayKey, groupByDay, monthStart, monthWeeks } from "./calendar";

describe("monthWeeks", () => {
  it("starts weeks on Monday and pads with neighbouring days", () => {
    // November 2026 starts on a Sunday and ends on a Monday.
    const weeks = monthWeeks(new Date(2026, 10, 1));
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].key).toBe("2026-10-26");
    expect(weeks[0][0].date.getDay()).toBe(1);
    expect(weeks[0][6]).toMatchObject({ key: "2026-11-01", inMonth: true });
    expect(weeks[5][0]).toMatchObject({ key: "2026-11-30", inMonth: true });
    expect(weeks[5][6]).toMatchObject({ key: "2026-12-06", inMonth: false });
  });

  it("needs no padding for a month that starts on Monday", () => {
    // February 2027 starts on a Monday and has exactly four weeks.
    const weeks = monthWeeks(new Date(2027, 1, 1));
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((d) => d.inMonth)).toBe(true);
  });
});

describe("monthStart", () => {
  it("moves across years in both directions", () => {
    const today = new Date(2026, 10, 12, 15, 30);
    expect(dayKey(monthStart(today, 0))).toBe("2026-11-01");
    expect(dayKey(monthStart(today, 2))).toBe("2027-01-01");
    expect(dayKey(monthStart(today, -11))).toBe("2025-12-01");
  });
});

describe("groupByDay", () => {
  it("buckets by local day, each day in time order", () => {
    const late = new Date(2026, 10, 16, 23, 30).toISOString();
    const early = new Date(2026, 10, 16, 9, 0).toISOString();
    const next = new Date(2026, 10, 17, 0, 15).toISOString();
    const days = groupByDay([
      { id: "late", next_round_at: late },
      { id: "next", next_round_at: next },
      { id: "early", next_round_at: early },
    ]);
    expect([...days.keys()]).toEqual(["2026-11-16", "2026-11-17"]);
    expect(days.get("2026-11-16")?.map((a) => a.id)).toEqual(["early", "late"]);
  });
});
