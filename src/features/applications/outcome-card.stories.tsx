import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { application, interview } from "@/test/applications";
import { OutcomeCard } from "./outcome-card";

// A Done Application's Outcome card (BIG-182), as its Application page shows it above the
// Interviews card. Dates are fixed: the card only counts days between two dates.
const screen = interview("screen", {
  application_id: "birch",
  category: "recruiter", title: "Recruiter Screen",
  at: "2026-11-03T15:00:00Z",
  takeaway: "Ask the recruiter about internal candidates early.",
});
const manager = interview("manager", {
  application_id: "birch",
  category: "hiring_manager", title: "Hiring Manager",
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

/** The corner art (BIG-227): decorative, so it has an empty alt and no role to query by. */
function art(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLImageElement>("section img");
}

/**
 * The art never covers text: it ends left of nothing in the label and heading rows, and above the
 * summary line, which keeps the card's full width.
 */
async function expectArtClearOfText(canvasElement: HTMLElement, sprite: string) {
  const img = art(canvasElement);
  await expect(img?.getAttribute("src")).toContain(sprite);
  await expect(img).toHaveAttribute("alt", "");
  const box = img!.getBoundingClientRect();
  const section = canvasElement.querySelector("section")!;
  const [label, summary] = section.querySelectorAll(":scope > div > p");
  const heading = section.querySelector("h2")!;
  const textRight = Math.max(
    ...[label, heading].map((row) => {
      const range = document.createRange();
      range.selectNodeContents(row);
      return range.getBoundingClientRect().right;
    }),
  );
  await expect(textRight).toBeLessThanOrEqual(box.left);
  await expect(box.bottom).toBeLessThanOrEqual(summary.getBoundingClientRect().top);
  await expect(summary.getBoundingClientRect().width).toBe(heading.parentElement!.getBoundingClientRect().width);
}

const offer = { ...birch, outcome: "offer" as const, outcome_note: "They matched the salary I asked for." };

const meta = {
  component: OutcomeCard,
  args: { app: birch },
  decorators: [(Story) => <main className="max-w-3xl">{Story()}</main>],
} satisfies Meta<typeof OutcomeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rejected, with a Done date, an Outcome note and two takeaways, newest Interview first. Sad Bigfoot sits in the corner. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expectArtClearOfText(canvasElement, "bigfoot-sad");
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

/** Rejected in light mode. */
export const RejectedLight: Story = {
  globals: { theme: "light" },
  play: async ({ canvasElement }) => expectArtClearOfText(canvasElement, "bigfoot-sad"),
};

/** An Offer: Bigfoot jumps for joy in the corner. */
export const Offer: Story = {
  args: { app: offer },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("heading", { level: 2, name: "Offer" })).toBeVisible();
    await expectArtClearOfText(canvasElement, "bigfoot-celebrating");
  },
};

/** An Offer in light mode. */
export const OfferLight: Story = {
  args: { app: offer },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => expectArtClearOfText(canvasElement, "bigfoot-celebrating"),
};

/** Withdrawn the day they applied, before any Interview. Only an Offer or a Rejection gets art. */
export const SameDay: Story = {
  args: { app: { ...birch, outcome: "withdrawn", done_on: "2026-10-20", outcome_note: null, interviews: [] } },
  play: async ({ canvas, canvasElement }) => {
    await expect(art(canvasElement)).toBeNull();
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

const longNote =
  "The hiring manager called to say they loved the platform roadmap discussion, but the role was reshaped into a staff engineer position after a reorg, and they went with an internal candidate who already knew the codebase.";

/** A long Outcome note and takeaway wrap inside the card, the full width under sad Bigfoot. */
export const LongText: Story = {
  args: {
    app: {
      ...birch,
      outcome_note: longNote,
      interviews: [
        {
          ...manager,
          takeaway:
            "Have a two-minute version of the reorg story ready, with the decision first, then the trade-off, then what changed for the team afterwards.",
        },
      ],
    },
  },
  play: async ({ canvasElement }) => expectArtClearOfText(canvasElement, "bigfoot-sad"),
};

/** An Offer with a long quote, in light mode: it runs the full width under celebrating Bigfoot. */
export const OfferLongQuoteLight: Story = {
  args: {
    app: {
      ...offer,
      outcome_note:
        "They came back within a day with a written offer, matched the salary I asked for, added a signing bonus, and agreed to a four-day week for the first three months while I wrap up my current team's handover.",
    },
  },
  globals: { theme: "light" },
  play: async ({ canvasElement }) => expectArtClearOfText(canvasElement, "bigfoot-celebrating"),
};
