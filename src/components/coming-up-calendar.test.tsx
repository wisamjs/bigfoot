import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatedInterview } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { ComingUpCalendar } from "./coming-up-calendar";

const monthName = (month: number) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2026, month, 1));

beforeEach(() => {
  // Friday 20 November 2026, mid-afternoon. Only Date is faked, so user events still run.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 20, 15, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/** One Interview at 10:00 on each given day of November, with its own company. */
function interviewsOn(...days: number[]): DatedInterview[] {
  return days.map((day, n) => {
    const at = new Date(2026, 10, day, 10, 0).toISOString();
    return { application: application(`a${n}`, { company: `Company ${n}` }), interview: { ...interview(`i${n}`, { at }), at } };
  });
}

/** Interviews on 20 November, today, at the given hours, with their own companies. */
function interviewsToday(...hours: number[]): DatedInterview[] {
  return hours.map((hour) => {
    const at = new Date(2026, 10, 20, hour, 0).toISOString();
    const id = `today-${hour}`;
    return { application: application(id, { company: `Today ${hour}:00` }), interview: { ...interview(id, { at }), at } };
  });
}

function agendaItems() {
  return within(screen.getByRole("list")).getAllByRole("listitem");
}

describe("ComingUpCalendar", () => {
  it("lists the whole month while it holds five Interviews", () => {
    render(<ComingUpCalendar interviews={interviewsOn(2, 3, 21, 25, 30)} />);
    expect(screen.getByRole("heading", { name: `Interviews in ${monthName(10)}` })).toBeInTheDocument();
    expect(agendaItems()).toHaveLength(5);
  });

  it("narrows to the next 2 weeks at six, leaving out earlier days", () => {
    render(<ComingUpCalendar interviews={interviewsOn(2, 3, 4, 21, 25, 30)} />);
    expect(screen.getByRole("heading", { name: "Interviews in the next 2 weeks" })).toBeInTheDocument();
    expect(agendaItems().map((li) => li.textContent)).toEqual([
      expect.stringContaining("Company 3"),
      expect.stringContaining("Company 4"),
      expect.stringContaining("Company 5"),
    ]);
  });

  it("shows another month whole, and Show upcoming returns from a picked day to the narrowed window", async () => {
    const user = userEvent.setup();
    render(<ComingUpCalendar interviews={interviewsOn(2, 3, 4, 21, 25, 30)} />);

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: `Interviews in ${monthName(9)}` })).toBeInTheDocument();
    expect(screen.getByText(`Nothing in ${monthName(9)} yet.`)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show upcoming" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Today" }));
    // 2 November, before the narrowed window.
    await user.click(screen.getAllByRole("button", { name: /, 1 Interview$/ })[0]);
    expect(screen.queryByRole("heading", { name: /^Interviews in/ })).not.toBeInTheDocument();
    expect(agendaItems().map((li) => li.textContent)).toEqual([expect.stringContaining("Company 0")]);
    expect(screen.queryByRole("button", { name: /show month/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show upcoming" }));
    const heading = screen.getByRole("heading", { name: "Interviews in the next 2 weeks" });
    expect(heading).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Show upcoming" })).not.toBeInTheDocument();
  });

  it("leaves completed Interviews earlier today out of the next 2 days (BIG-93)", () => {
    // Six still to come in the next week, three in the next 2 days. Counting the two completed
    // ones earlier today would list them too.
    const interviews = [...interviewsOn(2, 21, 21, 22, 23, 25), ...interviewsToday(9, 11, 16)];
    render(<ComingUpCalendar interviews={interviews} />);
    expect(screen.getByRole("heading", { name: "Interviews in the next 2 days" })).toBeInTheDocument();
    expect(agendaItems().map((li) => li.textContent)).toEqual([
      expect.stringContaining("Today 16:00"),
      expect.stringContaining("Company 1"),
      expect.stringContaining("Company 2"),
    ]);
  });

  it("says nothing is next when every Interview in a narrowed window is completed", () => {
    const interviews = [...interviewsOn(2, 3, 4, 5, 6), ...interviewsToday(9)];
    render(<ComingUpCalendar interviews={interviews} />);
    expect(screen.getByRole("heading", { name: "Interviews in the next 2 weeks" })).toBeInTheDocument();
    expect(screen.getByText("Nothing in the next 2 weeks yet.")).toBeInTheDocument();
  });

  it("still lists today's completed Interviews, muted, in the month and on the picked day", async () => {
    const user = userEvent.setup();
    render(<ComingUpCalendar interviews={interviewsToday(9, 16)} />);
    expect(screen.getByRole("heading", { name: `Interviews in ${monthName(10)}` })).toBeInTheDocument();
    expect(agendaItems().map((li) => li.textContent)).toEqual([
      expect.stringContaining("Today 9:00"),
      expect.stringContaining("Today 16:00"),
    ]);

    await user.click(screen.getByRole("button", { name: /, 2 Interviews$/ }));
    expect(agendaItems()).toHaveLength(2);
  });
});
