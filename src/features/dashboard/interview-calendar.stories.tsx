import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { DatedInterview, InterviewKind } from "@/lib/applications";
import { dayKey, monthParam, monthStart } from "@/lib/calendar";
import { previewApplications } from "@/lib/mock-data";
import { InterviewCalendar, InterviewCalendarSkeleton } from "./interview-calendar";

// The dashboard's Interviews calendar, for the landing page's sample Applications. Dates are set
// from today, so the month shown always has Interviews in it.

const DAY = 24 * 60 * 60 * 1000;

/** An Interview of the sample Application `id`, `days` from now (negative is past), at 10:00 local time. */
function on(id: string, kind: InterviewKind, days: number): DatedInterview {
  const application = previewApplications.find((a) => a.id === id)!;
  const at = new Date(Date.now() + days * DAY);
  at.setHours(10, 0, 0, 0);
  const iso = at.toISOString();
  return {
    application,
    interview: { ...application.interviews[0], id: `${id}-${kind}-${days}`, kind, at: iso, completed: days < 0 },
  };
}

const interviews = [
  on("datadog", "recruiter_screen", -6),
  on("linear", "hiring_manager", -2),
  on("stripe", "recruiter_screen", 1),
  on("datadog", "technical", 2),
  on("linear", "technical", 2),
  on("figma", "onsite_loop", 5),
  on("notion", "recruiter_screen", 9),
];

const meta = {
  component: InterviewCalendar,
  args: { interviews },
  parameters: { nextjs: { navigation: { pathname: "/dashboard" } } },
} satisfies Meta<typeof InterviewCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Past Interviews muted, upcoming ones listed beside the month. */
export const Default: Story = {};

/** No Interviews yet: Bigfoot sleeps. */
export const Empty: Story = { args: { interviews: [] } };

// Two Interviews two days from now, which can fall in next month, so the month goes in the URL too.
const twoDaysOn = new Date(interviews[3].interview.at);
const pickedDay = { month: monthParam(monthStart(twoDaysOn, 0)), day: dayKey(twoDaysOn) };

/**
 * A picked day lists only its Interviews, with Show upcoming to go back. The view lives in the URL,
 * which Storybook's router doesn't follow, so the story starts with the day in it.
 */
export const PickedDay: Story = {
  parameters: { nextjs: { navigation: { pathname: "/dashboard", query: pickedDay } } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /, 2 Interviews$/ })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("button", { name: "Show upcoming" })).toBeVisible();
  },
};

/** Next month: that month's Interviews, or a line saying it has none. */
export const NextMonth: Story = {
  parameters: {
    nextjs: { navigation: { pathname: "/dashboard", query: { month: monthParam(monthStart(new Date(), 1)) } } },
  },
};

/** Many Interviews: the agenda scrolls. */
export const Busy: Story = {
  args: {
    interviews: [
      ...interviews,
      ...(["behavioural", "leadership", "technical", "people_management", "onsite_loop"] as const).map((kind, i) =>
        on(previewApplications[i].id, kind, 3 + i),
      ),
    ],
  },
};

export const LongText: Story = {
  args: {
    interviews: interviews.map((d) => ({
      ...d,
      application: { ...d.application, company: "Northern Lights Software Engineering Co-operative of British Columbia" },
    })),
  },
};

/** What the server sends until the browser knows the job seeker's time zone. */
export const Loading: Story = { render: () => <InterviewCalendarSkeleton /> };
