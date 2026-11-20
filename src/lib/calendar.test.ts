import { describe, expect, it } from "vitest";
import { dayKey, groupByDay, monthStart, monthWeeks, monthWindow, upcomingWindow } from "./calendar";

const monthName = (month: number) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2026, month, 1));

describe("monthWindow", () => {
  it("spans the whole month", () => {
    expect(monthWindow(new Date(2027, 1, 1))).toEqual({ span: monthName(1), from: "2027-02-01", to: "2027-02-28" });
  });
});

describe("upcomingWindow", () => {
  // Friday 20 November 2026, mid-afternoon.
  const now = new Date(2026, 10, 20, 15, 0);
  /** One Interview at 10:00 on each given day of the month, `count` times over. */
  const on = (month: number, day: number, count = 1) =>
    Array.from({ length: count }, () => new Date(2026, month, day, 10, 0).toISOString());
  const nov = (day: number, count?: number) => on(10, day, count);

  it("keeps the whole month while it holds five or fewer, past ones included", () => {
    expect(upcomingWindow([], now)).toEqual(monthWindow(new Date(2026, 10, 1)));
    expect(upcomingWindow([...nov(2, 3), ...nov(25, 2)], now).span).toBe(monthName(10));
  });

  it("narrows to the next 2 weeks at six in the month, and leaves out earlier days", () => {
    const window = upcomingWindow([...nov(2, 4), ...nov(25, 2)], now);
    expect(window).toEqual({ span: "the next 2 weeks", from: "2026-11-20", to: "2026-12-03" });
  });

  it("counts next month's days in the next 2 weeks", () => {
    // Six in November keep it from fitting; 3 December is the 2 weeks' last day, 4 December is past it.
    const times = [...nov(2, 6), ...on(11, 3, 5), ...on(11, 4, 3)];
    expect(upcomingWindow(times, now).span).toBe("the next 2 weeks");
    expect(upcomingWindow([...times, ...on(11, 3)], now).span).toBe("the next week");
  });

  it("narrows to the next week, then the next 2 days", () => {
    // 26 November is the week's last day, 27 November is past it.
    const week = [...nov(20, 2), ...nov(26, 3), ...nov(27, 3)];
    expect(upcomingWindow(week, now)).toEqual({ span: "the next week", from: "2026-11-20", to: "2026-11-26" });
    expect(upcomingWindow([...week, ...nov(23)], now)).toEqual({
      span: "the next 2 days",
      from: "2026-11-20",
      to: "2026-11-21",
    });
  });

  it("counts an Interview earlier today in the narrowed windows", () => {
    const times = [...nov(20, 1), ...nov(21, 4), ...nov(26, 1)];
    expect(upcomingWindow([...times, ...nov(1)], now).span).toBe("the next 2 days");
  });

  it("stays on the next 2 days when even they hold more than five", () => {
    expect(upcomingWindow([...nov(20, 3), ...nov(21, 4)], now).span).toBe("the next 2 days");
  });
});

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
    const days = groupByDay(
      [
        { id: "late", at: late },
        { id: "next", at: next },
        { id: "early", at: early },
      ],
      (item) => item.at,
    );
    expect([...days.keys()]).toEqual(["2026-11-16", "2026-11-17"]);
    expect(days.get("2026-11-16")?.map((a) => a.id)).toEqual(["early", "late"]);
  });
});
