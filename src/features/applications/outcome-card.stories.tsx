import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { application, interview } from "@/test/applications";
import { OutcomeCard } from "./outcome-card";

// A Done Application's Outcome card (BIG-182), as its Application page shows it above the
// Interviews card. Dates are fixed: the card only counts days between two dates.
const screen = interview("screen", {
  application_id: "birch",
  kind: "recruiter_screen",
  at: "2026-11-03T15:00:00Z",
  takeaway: "Ask the recruiter about internal candidates early.",
});
const manager = interview("manager", {
  application_id: "birch",
  kind: "hiring_manager",
  at: "2026-11-12T16:00:00Z",
  takeaway: "Have a 2-minute version of the reorg story ready.",
});

const birch = application("birch", {
  company: "Birch Labs",
  title: "Engineering Manager, Platform",
  applied_on: "2026-10-20",
  status: "done",
  outcome: "rejected",
  done_on: "2026-11-16",
  outcome_note: "They went with an internal candidate.",
  is_waiting: false,
  waiting_since: null,
  interviews: [screen, manager],
});

const meta = {
  component: OutcomeCard,
  args: { app: birch },
  decorators: [(Story) => <main className="max-w-3xl">{Story()}</main>],
} satisfies Meta<typeof OutcomeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rejected, with a Done date, an Outcome note and two takeaways, newest Interview first. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Rejected" })).toBeVisible();
    await expect(canvas.getByText(/^Outcome/)).toHaveTextContent(/^Outcome · \S+/);
    await expect(canvas.getByText(/^After 2 Interviews, 27 days from applying\./)).toBeVisible();
    await expect(canvas.getByText("They went with an internal candidate.").tagName).toBe("Q");
    const items = within(canvas.getByRole("list")).getAllByRole("listitem");
    await expect(items.map((item) => item.querySelector("p")?.textContent)).toEqual([
      "Have a 2-minute version of the reorg story ready.",
      "Ask the recruiter about internal candidates early.",
    ]);
    await expect(items[0]).toHaveTextContent(/From Hiring Manager · \S+/);
  },
};

/** Marked Done before Bigfoot recorded when: no date beside Outcome, and no days counted. */
export const WithoutDoneDate: Story = {
  args: { app: { ...birch, done_on: null } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/^Outcome/)).toHaveTextContent(/^Outcome$/);
    await expect(canvas.getByText(/^After 2 Interviews\./)).toBeVisible();
  },
};

/** No Outcome note: the summary line ends with how it got there. */
export const WithoutOutcomeNote: Story = {
  args: { app: { ...birch, outcome_note: null } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("After 2 Interviews, 27 days from applying.")).toBeVisible();
    await expect(canvas.queryByText("They went with an internal candidate.")).not.toBeInTheDocument();
  },
};

/** No Interview has a takeaway: "What you're taking from it" is left out. */
export const WithoutTakeaways: Story = {
  args: { app: { ...birch, interviews: [{ ...screen, takeaway: null }, { ...manager, takeaway: "  " }] } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("What you’re taking from it")).not.toBeInTheDocument();
    await expect(canvas.queryByRole("list")).not.toBeInTheDocument();
  },
};

/** Withdrawn the day they applied, before any Interview. */
export const SameDay: Story = {
  args: { app: { ...birch, outcome: "withdrawn", done_on: "2026-10-20", outcome_note: null, interviews: [] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Withdrawn" })).toBeVisible();
    await expect(canvas.getByText("Before any Interview, on the day you applied.")).toBeVisible();
  },
};

/** One Interview and one day: singular words. */
export const OneOfEach: Story = {
  args: { app: { ...birch, outcome: "offer", done_on: "2026-10-21", outcome_note: null, interviews: [manager] } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("After 1 Interview, 1 day from applying.")).toBeVisible();
  },
};

/** A long Outcome note and takeaway wrap inside the card. */
export const LongText: Story = {
  args: {
    app: {
      ...birch,
      outcome_note:
        "The hiring manager called to say they loved the platform roadmap discussion, but the role was reshaped into a staff engineer position after a reorg, and they went with an internal candidate who already knew the codebase.",
      interviews: [
        {
          ...manager,
          takeaway:
            "Have a two-minute version of the reorg story ready, with the decision first, then the trade-off, then what changed for the team afterwards.",
        },
      ],
    },
  },
};
