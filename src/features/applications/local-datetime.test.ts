import { afterEach, describe, expect, it, vi } from "vitest";
import { fromLocalInput, toLocalInput, todayLocal } from "./local-datetime";

afterEach(() => vi.useRealTimers());

describe("toLocalInput", () => {
  it("writes a timestamp as the viewer's local date and time, to the minute", () => {
    expect(toLocalInput(new Date(2026, 11, 2, 13, 30, 45).toISOString())).toBe("2026-12-02T13:30");
  });

  it("is blank for no date", () => {
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput("")).toBe("");
  });
});

describe("fromLocalInput", () => {
  it("reads the viewer's local time as a timestamp", () => {
    expect(fromLocalInput("2026-12-02T13:30")).toBe(new Date(2026, 11, 2, 13, 30).toISOString());
  });

  it("is no date when blank, and passes anything else through for interviewErrors to refuse", () => {
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("tomorrow")).toBe("tomorrow");
  });

  it("round-trips with toLocalInput", () => {
    expect(toLocalInput(fromLocalInput("2026-03-08T02:30"))).toBe(toLocalInput(new Date(2026, 2, 8, 2, 30).toISOString()));
  });
});

describe("todayLocal", () => {
  it("is the viewer's date, not UTC's", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 23, 30));
    expect(todayLocal()).toBe("2026-11-25");
  });
});
