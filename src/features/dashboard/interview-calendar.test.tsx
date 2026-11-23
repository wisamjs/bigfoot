import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DatedInterview } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { InterviewCalendar, InterviewCalendarSkeleton } from "./interview-calendar";

vi.mock("next/navigation", () => import("@/test/navigation"));

const monthName = (month: number) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2026, month, 1));

beforeEach(() => {
  // Friday 20 November 2026, mid-afternoon. Only Date is faked, so user events still run.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 20, 15, 0));
});

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, "", "/dashboard");
  sessionStorage.clear();
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
  return within(screen.getByRole("region", { name: /^(Next|November|December|October)/ })).getAllByRole("listitem");
}

/** The picked day's panel under the grid, named by its date. */
function pickedDay() {
  return screen.getByRole("region", { name: /^\w+day, / });
}

describe("InterviewCalendar", () => {
  it("shows the month grid, Monday first, with every day of the month a button and today picked", () => {
    render(<InterviewCalendar interviews={interviewsOn(25)} />);
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent(/^Mon/);
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
    expect(screen.getByRole("button", { pressed: true })).toHaveAccessibleName(/November 20$/);
    expect(screen.getByRole("button", { name: /November 25, 1 Interview$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /November 3$/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Today" })).not.toBeInTheDocument();
  });

  it("lists the whole month while it holds five Interviews", () => {
    render(<InterviewCalendar interviews={interviewsOn(2, 3, 21, 25, 30)} />);
    expect(screen.getByRole("heading", { name: monthName(10) })).toBeInTheDocument();
    expect(screen.getByText("5 Interviews")).toBeInTheDocument();
    expect(agendaItems()).toHaveLength(5);
  });

  it("narrows to the next 2 weeks at six, leaving out earlier days", () => {
    render(<InterviewCalendar interviews={interviewsOn(2, 3, 4, 21, 25, 30)} />);
    expect(screen.getByRole("heading", { name: "Next 2 weeks" })).toBeInTheDocument();
    expect(agendaItems().map((li) => li.textContent)).toEqual([
      expect.stringContaining("Company 3"),
      expect.stringContaining("Company 4"),
      expect.stringContaining("Company 5"),
    ]);
  });

  it("shows another month whole, or a line when it has none", async () => {
    const user = userEvent.setup();
    render(<InterviewCalendar interviews={interviewsOn(2, 3, 4, 21, 25, 30)} />);

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: `${monthName(9)} 2026` })).toBeInTheDocument();
    expect(screen.getByText(`Nothing in ${monthName(9)} yet.`)).toBeInTheDocument();
  });

  it("shows a picked day's Interviews under the grid, each opening its Interview page", async () => {
    const user = userEvent.setup();
    render(<InterviewCalendar interviews={interviewsOn(2, 25)} />);
    expect(within(pickedDay()).getByText("No Interviews this day.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /November 25, 1 Interview$/ }));
    expect(screen.getByRole("button", { name: /November 25, 1 Interview$/ })).toHaveAttribute("aria-pressed", "true");
    const link = within(pickedDay()).getByRole("link", { name: /Company 1$/ });
    expect(link).toHaveAttribute("href", "/applications/a1/interviews/i1");
    expect(link).toHaveTextContent(/Technical · Company 1/);

    // Picking a day leaves the agenda as it was.
    expect(screen.getByRole("heading", { name: monthName(10) })).toBeInTheDocument();
  });

  it("leaves completed Interviews earlier today out of the next 2 days (BIG-93)", () => {
    // Six still to come in the next week, three in the next 2 days. Counting the two completed
    // ones earlier today would list them too.
    const interviews = [...interviewsOn(2, 21, 21, 22, 23, 25), ...interviewsToday(9, 11, 16)];
    render(<InterviewCalendar interviews={interviews} />);
    expect(screen.getByRole("heading", { name: "Next 2 days" })).toBeInTheDocument();
    expect(agendaItems().map((li) => li.textContent)).toEqual([
      expect.stringContaining("Today 16:00"),
      expect.stringContaining("Company 1"),
      expect.stringContaining("Company 2"),
    ]);
  });

  it("says all is quiet when every Interview in a narrowed window is completed (BIG-97)", () => {
    const interviews = [...interviewsOn(2, 3, 4, 5, 6), ...interviewsToday(9)];
    render(<InterviewCalendar interviews={interviews} />);
    expect(screen.getByRole("heading", { name: "All quiet in the woods" })).toBeInTheDocument();
    expect(screen.getByText("Interviews you add show up here and on the calendar.")).toBeInTheDocument();
  });

  it("says how many Applications are waiting when this month has no Interviews", () => {
    render(<InterviewCalendar interviews={[]} waiting={3} />);
    expect(screen.getByRole("heading", { name: "No Interviews this month" })).toBeInTheDocument();
    expect(
      screen.getByText("3 Applications are waiting to hear back. When an Interview is booked, add it here."),
    ).toBeInTheDocument();
  });

  it("says there are no upcoming Interviews when this month's are all completed and Applications wait", () => {
    const interviews = [...interviewsOn(2, 3, 4, 5, 6), ...interviewsToday(9)];
    render(<InterviewCalendar interviews={interviews} waiting={1} />);
    expect(screen.getByRole("heading", { name: "No upcoming Interviews" })).toBeInTheDocument();
    expect(screen.getByText(/^1 Application is waiting to hear back/)).toBeInTheDocument();
  });

  it("says all is quiet with no dated Interviews, and keeps other months to one line (BIG-97)", async () => {
    const user = userEvent.setup();
    render(<InterviewCalendar interviews={[]} />);
    expect(screen.getByRole("heading", { name: "All quiet in the woods" })).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.queryByRole("heading", { name: "All quiet in the woods" })).not.toBeInTheDocument();
    expect(screen.getByText("Add a dated Interview to an Application and it shows up here.")).toBeInTheDocument();
  });

  it("still lists today's completed Interviews, muted, in the month and on the picked day", () => {
    render(<InterviewCalendar interviews={interviewsToday(9, 16)} />);
    expect(screen.getByRole("heading", { name: monthName(10) })).toBeInTheDocument();
    expect(agendaItems().map((li) => li.textContent)).toEqual([
      expect.stringContaining("Today 9:00"),
      expect.stringContaining("Today 16:00"),
    ]);
    // Today is picked, so its panel lists both too.
    expect(within(pickedDay()).getAllByRole("link")).toHaveLength(2);
  });

  it("links every agenda item, past or upcoming, to its Interview page", () => {
    render(<InterviewCalendar interviews={[...interviewsOn(2), ...interviewsToday(16)]} />);
    const links = within(screen.getByRole("region", { name: monthName(10) })).getAllByRole("link");
    expect(links).toHaveLength(2);
    // 2 November is past, and still opens.
    expect(links[0]).toHaveAttribute("href", "/applications/a0/interviews/i0");
    expect(links[0]).toHaveAccessibleName(/^Open Interview: Company 0, Technical, Monday, November 2 at /);
    expect(links[1]).toHaveAttribute("href", "/applications/today-16/interviews/today-16");
  });

  it("keeps the month and picked day in the URL, and remembers them for ← Dashboard", async () => {
    const user = userEvent.setup();
    render(<InterviewCalendar interviews={interviewsOn(2, 25)} />);

    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(window.location.search).toBe("?month=2026-12");
    expect(sessionStorage.getItem("bigfoot:dashboard-view")).toBe("?month=2026-12");

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    expect(window.location.search).toBe("");
    await user.click(screen.getByRole("button", { name: /November 25, 1 Interview$/ }));
    expect(window.location.search).toBe("?day=2026-11-25");
    expect(sessionStorage.getItem("bigfoot:dashboard-view")).toBe("?day=2026-11-25");

    // Picking today again is the default view.
    await user.click(screen.getByRole("button", { name: /November 20$/ }));
    expect(window.location.search).toBe("");
  });

  it("opens on the month and day the URL gives, as Back from an Interview page does", () => {
    window.history.replaceState(null, "", "/dashboard?month=2026-12&day=2026-12-04");
    const at = new Date(2026, 11, 4, 10, 0).toISOString();
    render(
      <InterviewCalendar
        interviews={[{ application: application("dec", { company: "December Co" }), interview: { ...interview("dec-1", { at }), at } }]}
      />,
    );
    expect(screen.getByRole("heading", { name: "December 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /December 4, 1 Interview$/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(pickedDay()).getByRole("link", { name: /December Co$/ })).toBeInTheDocument();
    expect(agendaItems().map((li) => li.textContent)).toEqual([expect.stringContaining("December Co")]);
  });

  it("opens this month with today picked for a malformed month or day", () => {
    window.history.replaceState(null, "", "/dashboard?month=soon&day=2026-02-31");
    render(<InterviewCalendar interviews={interviewsOn(25)} />);
    expect(screen.getByRole("heading", { name: monthName(10) })).toBeInTheDocument();
    expect(screen.getByRole("button", { pressed: true })).toHaveAccessibleName(/November 20$/);
  });
});

describe("InterviewCalendarSkeleton", () => {
  it("draws a five-week month and four agenda items, hidden from assistive tech", () => {
    // Skeleton shapes are aria-hidden, with no role or text, so this checks the DOM itself.
    // eslint-disable-next-line testing-library/no-node-access -- see above
    const card = render(<InterviewCalendarSkeleton />).container.firstElementChild!;
    expect(card).toHaveAttribute("aria-hidden", "true");
    // eslint-disable-next-line testing-library/no-node-access -- see above
    expect(card.querySelectorAll(".grid-cols-7 > .h-12")).toHaveLength(35);
    // eslint-disable-next-line testing-library/no-node-access -- see above
    expect(card.querySelectorAll("li")).toHaveLength(4);
  });
});
