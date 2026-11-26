import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { lockAction } from "@/app/journey/[id]/actions";
import type { Journey, JourneyApplication, JourneyInterview } from "@/lib/journey";
import { JourneySkeleton, JourneyView } from "./journey-view";

// A Share link's Journey (BIG-197), as a Viewer sees it. Times are relative to now, so "Tomorrow"
// and "In 9 days" read the same on any day; they show in the browser's time zone. Lock is mocked
// (src/app/journey/[id]/__mocks__/actions.ts).

/** Rows draw Progress and Next twice, stacked for a phone and in columns wider: the ones showing. */
const showing = (elements: HTMLElement[]) => elements.filter((element) => element.checkVisibility());

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** `days` from now at `hour`:00 in the viewer's time zone. */
function on(days: number, hour: number) {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}
const isoDay = (days: number) => on(days, 12).slice(0, 10);

function interview(title: string, category: JourneyInterview["category"], days: number, hour = 14): JourneyInterview {
  return { title, category, at: on(days, hour), completed: days < 0 };
}

function application(fields: Partial<JourneyApplication> & Pick<JourneyApplication, "company" | "title">): JourneyApplication {
  const interviews = fields.interviews ?? [];
  const waiting = !fields.offer && interviews.every((i) => i.completed);
  return {
    applied_on: isoDay(-30),
    offer: false,
    is_waiting: waiting,
    waiting_since: waiting ? (interviews.at(-1)?.at ?? fields.applied_on ?? isoDay(-30)) : null,
    interviews,
    ...fields,
  };
}

const cobalt = application({
  company: "Cobalt Genomics",
  title: "Engineering Manager, Web",
  offer: true,
  interviews: [
    interview("Recruiter", "recruiter", -20),
    interview("Hiring Manager", "hiring_manager", -15),
    interview("System Design", "system_design", -10),
    interview("Leadership", "people_management", -6),
  ],
});
const tilth = application({
  company: "Tilth Agritech",
  title: "Head of Engineering",
  interviews: [interview("Hiring Manager", "hiring_manager", 1)],
});
const lumen = application({
  company: "Lumen Bio",
  title: "Engineering Manager, ML Platform",
  interviews: [
    interview("Recruiter", "recruiter", -9),
    interview("Technical", "technical", -4),
    interview("Technical Deep-Dive", "project_deep_dive", 2, 11),
    interview("Leadership", "people_management", 9, 13),
  ],
});
const northwind = application({
  company: "Northwind Labs",
  title: "Engineering Manager, Data Products",
  interviews: [interview("Recruiter", "recruiter", -12), interview("Onsite Loop", "decision_maker", 11, 9)],
});
const fernway = application({
  company: "Fernway Health",
  title: "Engineering Manager, Platform",
  interviews: [interview("Recruiter", "recruiter", -13)],
});
const quillon = application({ company: "Quillon Learning", title: "Senior Engineering Manager", applied_on: isoDay(-5) });

const journey: Journey = {
  shared_by: "Wisam Zaghal",
  applications: [cobalt, tilth, lumen, northwind, fernway, quillon],
  other_completed_interviews: [],
};

const meta = {
  component: JourneyView,
  args: { id: "k7Qm2x9PaB", journey },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof JourneyView>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * With an Offer, Applications Interviewing and Waiting: the counts, the next Interview with what it
 * is, the calendar and After that, and Where things stand.
 */
export const WithOffers: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Wisam’s Journey" })).toBeVisible();
    await expect(canvas.getByText(/^Times are in your time zone \(.+\)$/)).toBeVisible();
    await expect(canvas.getByText("Shared by Wisam Zaghal")).toBeVisible();

    const glance = within(canvas.getByRole("list", { name: "At a glance" }));
    await expect(glance.getByText("Offer to decide")).toBeVisible();
    await expect(glance.getByText("waiting to hear back")).toBeVisible();

    const next = within(canvas.getByRole("region", { name: "Hiring Manager at Tilth Agritech" }));
    await expect(next.getByText("Next Interview · tomorrow")).toBeVisible();
    await expect(next.getByText(/a conversation with the person this role reports to/)).toBeVisible();

    const where = within(canvas.getByRole("region", { name: "Where things stand" }));
    const groups = where.getAllByRole("columnheader").map((header) => header.textContent);
    await expect(groups).toEqual(expect.arrayContaining(["Got an Offer", "Interviewing", "Waiting to hear back"]));
    const once = ["Thinking it over", "2 of 4 done", "All 4 done", "Waiting · 5 days"];
    await expect(once.map((text) => showing(where.getAllByText(text)).length)).toEqual([1, 1, 1, 1]);
    await expect(showing(where.getAllByText("Nothing booked yet"))).toHaveLength(2);

    await expect(canvas.getByText("Interviews")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "After that" })).toBeVisible();
  },
};

/** No pronouns, and nothing private: no salary, notes or Applications that ended without an Offer. */
export const NoPronouns: Story = {
  play: async ({ canvasElement }) => {
    const text = canvasElement.textContent ?? "";
    await expect(text).not.toMatch(/\b(he|his|him|she|her|they|their|them)\b/i);
    await expect(text).toContain("Wisam shared this view-only page with you. Notes and prep stay private.");
  },
};

/** On a phone: the next Interview first, then the counts, Coming up with Show month, and Where things stand. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("View only · shared by Wisam Zaghal")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Coming up" })).toBeVisible();
    await expect(canvas.queryByRole("table", { name: /\d{4}$/ })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Show month" }));
    await expect(canvas.getByRole("table", { name: /\d{4}$/ })).toBeVisible();
  },
};

/** Nothing booked: every Application is waiting to hear back, so there is no next Interview. */
export const NothingBooked: Story = {
  args: { journey: { shared_by: "Wisam Zaghal", applications: [fernway, quillon], other_completed_interviews: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Next Interview/)).not.toBeInTheDocument();
    await expect(showing(canvas.getAllByText("Nothing booked yet"))).toHaveLength(2);
    await expect(canvas.getByText("Nothing else booked yet.")).toBeVisible();
  },
};

/** No Applications in progress, and no Offers. */
export const NoApplications: Story = {
  args: { journey: { shared_by: "Wisam Zaghal", applications: [], other_completed_interviews: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No Applications in progress right now.")).toBeVisible();
  },
};

/**
 * Applications that ended without an Offer still count their completed Interviews this month
 * (BIG-206), and show nothing else: here one, at midnight today.
 */
export const DoneApplicationsCounted: Story = {
  args: { journey: { shared_by: "Wisam Zaghal", applications: [], other_completed_interviews: [on(0, 0)] } },
  play: async ({ canvas }) => {
    const completed = within(canvas.getByRole("list", { name: "At a glance" })).getByText("Interview completed this month");
    await expect(completed.previousElementSibling).toHaveTextContent("1");
    await expect(canvas.getByText("No Applications in progress right now.")).toBeVisible();
  },
};

/** Lock forgets the Viewer's cookie for this link and goes back to the Passcode page. */
export const Lock: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Lock" }));
    await waitFor(() => expect(lockAction).toHaveBeenCalledWith("k7Qm2x9PaB", expect.any(FormData)));
  },
};

/** What the server sends until the browser knows the Viewer's time zone. */
export const Loading: Story = { render: () => <JourneySkeleton /> };
