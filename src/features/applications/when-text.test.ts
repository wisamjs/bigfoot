import { describe, expect, it } from "vitest";
import { capitalize, nearness, nextWhen, readyByWeekday } from "./when-text";

// Local times: the tests check the viewer's own day, whatever time zone they run in.
const TODAY = new Date(2026, 10, 25, 9, 0); // Wed, Nov 25
const on = (day: number, hour = 14, minute = 0) => new Date(2026, 10, day, hour, minute);
// The viewer's locale writes the times: "2:00 PM", "2:00 p.m.".
const time = (date: Date) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
const weekdayTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(date);
const dayTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);

describe("capitalize", () => {
  it("starts the text with a capital and leaves the rest", () => {
    expect(capitalize("in 2 days")).toBe("In 2 days");
    expect(capitalize("")).toBe("");
  });
});

describe("nearness", () => {
  it.each([
    [-3, "soon"],
    [0, "soon"],
    [1, "soon"],
    [2, "week"],
    [6, "week"],
    [7, "later"],
    [30, "later"],
  ])("calls %i days away %s", (days, expected) => {
    expect(nearness(days)).toBe(expected);
  });
});

describe("nextWhen", () => {
  it("writes today and tomorrow with the time alone, in the brand colour", () => {
    expect(nextWhen(on(25, 16), TODAY)).toEqual({ text: `Today · ${time(on(25, 16))}`, soon: true });
    expect(nextWhen(on(26), TODAY)).toEqual({ text: `Tomorrow · ${time(on(26))}`, soon: true });
    expect(nextWhen(on(24), TODAY)).toEqual({ text: `Yesterday · ${time(on(24))}`, soon: true });
  });

  it("writes the weekday within the week, and the date after it", () => {
    expect(nextWhen(on(27, 11), TODAY)).toEqual({ text: `In 2 days · ${weekdayTime(on(27, 11))}`, soon: false });
    expect(nextWhen(on(32, 9, 30), TODAY)).toEqual({ text: `In 7 days · ${dayTime(on(32, 9, 30))}`, soon: false });
  });

  it("keeps a phone's one line short: the time only when it's soon", () => {
    expect(nextWhen(on(26), TODAY, true)).toEqual({ text: `tomorrow ${time(on(26))}`, soon: true });
    expect(nextWhen(on(27), TODAY, true)).toEqual({ text: "in 2 days", soon: false });
  });
});

describe("readyByWeekday", () => {
  it("names the weekday from today through the next 6 days, and the date otherwise", () => {
    expect(readyByWeekday(on(25), TODAY)).toBe(true);
    expect(readyByWeekday(on(31), TODAY)).toBe(true);
    expect(readyByWeekday(on(32), TODAY)).toBe(false);
    expect(readyByWeekday(on(24), TODAY)).toBe(false);
  });
});
