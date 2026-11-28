import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { prepTakeaways } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { NextInterviewCard } from "./next-interview-card";

// The Next up card. On the Application page it is shown through application-editor.stories.tsx;
// these stories are the dashboard's (BIG-183): the job seeker's soonest upcoming Interview, with
// the takeaways that apply (prepTakeaways) and its Prep notes. Dates are counted from today.
const daysFromNow = (days: number, hour = 15) => {
  const date = new Date();
  date.setDate(date.getDate() + days); // calendar days: days × 24h misses by one across a DST change
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const deepDive = interview("deep-dive", {
  application_id: "lumen",
  category: "project_deep_dive", title: "Technical Deep-Dive",
  at: daysFromNow(1, 11),
  completed: false,
});

const lumen = application("lumen", {
  company: "Lumen Bio",
  title: "Engineering Manager, ML Platform",
  is_waiting: false,
  interviews: [
    interview("manager", {
      application_id: "lumen",
      category: "hiring_manager", title: "Hiring Manager",
      at: daysFromNow(-10, 11),
      takeaway: "Lead with the decision, then the trade-off, then what I would measure.",
    }),
    deepDive,
  ],
});

// Another Application with a Technical Deep-Dive behind it, for the second takeaway.
const fernway = application("fernway", {
  company: "Fernway Health",
  status: "done",
  outcome: "rejected",
  is_waiting: false,
  interviews: [
    interview("fernway-dive", {
      application_id: "fernway",
      category: "project_deep_dive", title: "Technical Deep-Dive",
      at: daysFromNow(-30, 14),
      takeaway: "Draw the system before talking through it.",
    }),
  ],
});

const prepNotes = "Review the feature store migration.\nAsk who owns on-call for the training cluster.";

const meta = {
  component: NextInterviewCard,
  args: {
    on: "dashboard",
    app: { ...lumen, interviews: [lumen.interviews[0], { ...deepDive, prep_notes: prepNotes }] },
    interview: { ...deepDive, prep_notes: prepNotes },
    lookBack: { takeaways: prepTakeaways([lumen, fernway], lumen, deepDive), theyAsked: null },
  },
  parameters: { nextjs: { navigation: { pathname: "/dashboard" } } },
} satisfies Meta<typeof NextInterviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Tomorrow's Interview with two takeaways and its Prep notes; Open Interview opens its Interview page. */
export const WithTakeawaysAndPrepNotes: Story = {
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: "Round 2 · Technical Deep-Dive" });
    await expect(within(card).getByText(/^Next up · tomorrow$/i)).toBeVisible();
    await expect(within(card).getByText(/^Lumen Bio · Engineering Manager, ML Platform ·/)).toBeVisible();
    await expect(within(card).getAllByRole("listitem")).toHaveLength(2);
    await expect(within(card).getByRole("heading", { name: "Prep notes" })).toBeVisible();
    await expect(within(card).getByText(/Review the feature store migration/)).toBeVisible();
    await expect(within(card).getByRole("link", { name: "Open Interview" })).toHaveAttribute(
      "href",
      "/applications/lumen/interviews/deep-dive",
    );
  },
};

/** No takeaways apply and no Prep notes yet: Add Prep notes opens its Interview page. */
export const WithoutTakeawaysOrPrepNotes: Story = {
  args: {
    app: lumen,
    interview: deepDive,
    lookBack: { takeaways: [], theyAsked: null },
  },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: "Round 2 · Technical Deep-Dive" });
    await expect(within(card).queryByRole("list", { name: "Takeaways for this Interview" })).not.toBeInTheDocument();
    await expect(within(card).getByRole("link", { name: "Add Prep notes" })).toHaveAttribute(
      "href",
      "/applications/lumen/interviews/deep-dive",
    );
    await expect(within(card).getByText("No Prep notes yet.")).toBeVisible();
  },
};

/** Takeaways, but no Prep notes yet. */
export const TakeawaysWithoutPrepNotes: Story = {
  args: { app: lumen, interview: deepDive },
};

/** Formatted Prep notes (BIG-214): a title sits one level under the card's "Prep notes" heading, then bold and a list. */
export const FormattedPrepNotes: Story = {
  args: {
    interview: { ...deepDive, prep_notes: "# Review\n\nThe **feature store** migration:\n\n1. Why we moved\n2. What broke" },
    lookBack: { takeaways: [], theyAsked: null },
  },
  play: async ({ canvas }) => {
    const card = canvas.getByRole("region", { name: "Round 2 · Technical Deep-Dive" });
    await expect(within(card).getByRole("heading", { level: 4, name: "Review" })).toBeVisible();
    await expect(within(card).getByText("feature store").tagName).toBe("STRONG");
    await expect(within(card).getAllByRole("listitem")).toHaveLength(2);
  },
};

/** Prep notes, but no takeaways apply. */
export const PrepNotesWithoutTakeaways: Story = {
  args: { lookBack: { takeaways: [], theyAsked: null } },
};
