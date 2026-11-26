import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { AddInterviewLink } from "@/features/applications/add-links";
import type { DatedInterview, InterviewCategory } from "@/lib/applications";
import { dayKey, monthParam, monthStart } from "@/lib/calendar";
import { previewApplications } from "@/lib/mock-data";
import { DashboardCard } from "./dashboard-card";
import { InterviewCalendar, InterviewCalendarSkeleton } from "./interview-calendar";

// The dashboard's Interviews card, for the landing page's sample Applications. Dates are set from
// today, so the month shown always has Interviews in it.


/**
 * An Interview of the sample Application `id`, its category and title, `days` from now (negative is
 * past), at 10:00 local time.
 */
function on(id: string, [category, title]: [InterviewCategory, string], days: number): DatedInterview {
  const application = previewApplications().find((a) => a.id === id)!;
  const at = new Date();
  at.setDate(at.getDate() + days); // calendar days: days × 24h misses by one across a DST change
  at.setHours(10, 0, 0, 0);
  const iso = at.toISOString();
  return {
    application,
    interview: { ...application.interviews[0], id: `${id}-${category}-${days}`, category, title, at: iso, completed: days < 0 },
  };
}

const interviews = [
  on("datadog", ["recruiter", "Recruiter Screen"], -6),
  on("linear", ["hiring_manager", "Hiring Manager"], -2),
  on("stripe", ["recruiter", "Recruiter Screen"], 1),
  on("datadog", ["technical", "Technical"], 2),
  on("linear", ["technical", "Pair Programming"], 2),
  on("figma", ["system_design", "Retrospective System Design"], 5),
  on("notion", ["recruiter", "Recruiter Screen"], 9),
];

const meta = {
  component: InterviewCalendar,
  args: { interviews, waiting: 0 },
  parameters: { nextjs: { navigation: { pathname: "/dashboard" } } },
  // As on the dashboard: inside the Interviews card, at the card's width.
  decorators: [
    (Story) => (
      <div className="max-w-[23.75rem]">
        <DashboardCard id="interviews-title" title="Interviews" actions={<AddInterviewLink />}>
          <Story />
        </DashboardCard>
      </div>
    ),
  ],
} satisfies Meta<typeof InterviewCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Today picked, past Interviews muted, upcoming ones in the agenda, each with its › to open it. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("button", { pressed: true })).toHaveLength(1);
    await expect(canvas.getAllByRole("link", { name: /^Open Interview: / }).length).toBeGreaterThan(0);
  },
};

/** No Interviews and no Applications waiting: all quiet in the woods. */
export const Empty: Story = { args: { interviews: [] } };

/** No Interviews this month, with Applications waiting to hear back. */
export const Waiting: Story = { args: { interviews: [], waiting: 3 } };

// Two Interviews two days from now, which can fall in next month, so the month goes in the URL too.
const twoDaysOn = new Date(interviews[3].interview.at);
const pickedDay = { month: monthParam(monthStart(twoDaysOn, 0)), day: dayKey(twoDaysOn) };

/**
 * A picked day lists its Interviews under the grid. The view lives in the URL, which Storybook's
 * router doesn't follow, so the story starts with the day in it.
 */
export const PickedDay: Story = {
  parameters: { nextjs: { navigation: { pathname: "/dashboard", query: pickedDay } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /, 2 Interviews$/ })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("region", { name: /^\w+day, / })).toHaveTextContent(/Technical/);
  },
};

const inThreeDays = new Date();
inThreeDays.setDate(inThreeDays.getDate() + 3);

/** A picked day with nothing on it. */
export const PickedEmptyDay: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: "/dashboard",
        query: { month: monthParam(monthStart(inThreeDays, 0)), day: dayKey(inThreeDays) },
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No Interviews this day.")).toBeVisible();
  },
};

// A rejected Application's Interview 3 days ago: the dashboard keeps it once the Application is Done (BIG-206).
const rejected = on("stripe", ["technical", "Rejected Loop"], -3);
rejected.application = { ...rejected.application, status: "done", outcome: "rejected" };
const rejectedDay = new Date(rejected.interview.at);

/** A Done Application's completed Interview stays on its day (BIG-206). */
export const DoneApplication: Story = {
  args: { interviews: [rejected] },
  parameters: {
    nextjs: {
      navigation: { pathname: "/dashboard", query: { month: monthParam(monthStart(rejectedDay, 0)), day: dayKey(rejectedDay) } },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("region", { name: /^\w+day, / })).toHaveTextContent(/Rejected Loop/);
  },
};

/** Next month: that month's Interviews, or a line saying it has none. */
export const NextMonth: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/dashboard", query: { month: monthParam(monthStart(new Date(), 1)) } } },
  },
};

/** Many Interviews: the agenda narrows its window. */
export const Busy: Story = {
  args: {
    interviews: [
      ...interviews,
      ...(
        [
          ["culture", "Culture"],
          ["people_management", "Leadership"],
          ["technical", "Technical"],
          ["people_management", "People Management"],
          ["decision_maker", "Strategic Alignment with Sr Director"],
        ] as const
      ).map(([category, title], i) => on(previewApplications()[i].id, [category, title], 3 + i)),
    ],
  },
};

export const LongText: Story = {
  args: {
    interviews: interviews.map((d) => ({
      ...d,
      application: {
        ...d.application,
        company: "Northern Lights Software Engineering Co-operative of British Columbia",
        title: "Principal Staff Software Engineer, Developer Platform and Infrastructure",
      },
    })),
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/**
 * On a phone (BIG-195): this week's row of days, Monday first, with "Show month". The agenda puts
 * how far off each Interview is over its time; the soonest one's date is filled in the brand
 * colour, and "Tomorrow" is in the brand colour too.
 */
export const Phone: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    const week = canvas.getByRole("table", { name: "This week" });
    await expect(week).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: /\d{4}$/ })).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Show month" })).toBeVisible();
    await expect(canvas.getByText("Tomorrow")).toHaveClass("text-fg-brand");
    await expect(canvas.getAllByText(/^In \d+ days$/).length).toBeGreaterThan(0);
  },
};

/** On a phone after "Show month": the month grid, with "Show this week" to go back. */
export const PhoneMonth: Story = {
  globals: phone,
  parameters: { nextjs: { navigation: { pathname: "/dashboard", query: { calendar: "month" } } } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("table", { name: "This week" })).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Next month" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Show this week" })).toBeVisible();
  },
};

/** What the server sends until the browser knows the job seeker's time zone. */
export const Loading: Story = { render: () => <InterviewCalendarSkeleton /> };
