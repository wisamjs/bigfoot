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
});
