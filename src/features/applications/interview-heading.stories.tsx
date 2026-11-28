import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { InterviewHeading } from "./interview-heading";

// The Interview page's heading (BIG-178). Dates are counted from today, so the badge reads as it
// would on the page. Server Actions are mocked (src/app/applications/__mocks__/actions.ts) and
// succeed unless a story says otherwise.
const daysFromNow = (days: number, hour = 15) => {
  const date = new Date();
  date.setDate(date.getDate() + days); // calendar days: days × 24h misses by one across a DST change
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const upcoming = interview("deep-dive", {
  application_id: "lumen",
  category: "project_deep_dive",
  title: "Technical Deep-Dive",
  at: daysFromNow(2, 11),
  completed: false,
  participants: [
    { id: "ines", role: "Engineering Manager", name: "Inés Ortega" },
    { id: "staff", role: "Staff Engineer", name: null },
  ],
});
const completed = interview("manager", {
  application_id: "lumen",
  category: "hiring_manager",
  title: "Hiring Manager",
  at: daysFromNow(-10, 11),
  participants: [{ id: "ines", role: "Engineering Manager", name: "Inés Ortega" }],
});
const lumen = application("lumen", {
  company: "Lumen Bio",
  title: "Engineering Manager, ML Platform",
  interviews: [completed, upcoming],
});

const meta = {
  component: InterviewHeading,
  args: { app: lumen, interview: upcoming },
  decorators: [(Story) => <main className="max-w-4xl">{Story()}</main>],
} satisfies Meta<typeof InterviewHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Coming up: "Round 2 · " and its title (its Round number, BIG-190), who the job seeker is meeting
 * (BIG-191), its date and time with the year, and its category tag beside a blue "Upcoming · in 2 days".
 */
export const Upcoming: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Round 2 · Technical Deep-Dive" })).toBeVisible();
    await expect(canvas.getByText("With Inés Ortega (Engineering Manager), Staff Engineer")).toBeVisible();
    await expect(canvas.getByText("Project Deep-dive")).toBeVisible();
    await expect(await canvas.findByText("Upcoming · in 2 days")).toBeVisible();
    // An action for the whole page is a labelled tertiary button (BIG-240).
    await expect(canvas.getByRole("button", { name: "Edit details" })).toHaveClass("btn-tertiary");
  },
};

/** Past: the first by date, so Round 1, and a green "Completed · 10 days ago". */
export const Completed: Story = {
  args: { interview: completed },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Round 1 · Hiring Manager" })).toBeVisible();
    await expect(await canvas.findByText("Completed · 10 days ago")).toBeVisible();
  },
};

/** A Done Application: its "Done · Rejected" badge stays, and the Interview's completed badge turns grey. */
export const DoneApplication: Story = {
  args: { app: { ...lumen, status: "done", outcome: "rejected" }, interview: completed },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Done · Rejected")).toBeVisible();
    await expect(await canvas.findByText("Completed · 10 days ago")).toBeVisible();
  },
};

/** An Interview from before Participants: "Add who you’re meeting" opens Edit details at the first person. */
export const NobodyYet: Story = {
  args: { interview: { ...upcoming, participants: [] } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add who you’re meeting" }));
    await waitFor(() => expect(canvas.getByRole("textbox", { name: "Role" })).toHaveFocus());
  },
};

/** Edit details lists who's in it; changing one says it changes them on every Interview they're in. */
export const EditParticipants: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    const [, second] = canvas.getAllByRole("textbox", { name: /^Name/ });
    await userEvent.type(second, "Ana Silva");
    await expect(canvas.getByText(/changes them on every Interview they’re in/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(actions.updateInterviewAction).toHaveBeenCalledWith("lumen", upcoming.id, {
        participants: [
          { id: "ines", role: "Engineering Manager", name: "Inés Ortega" },
          { id: "staff", role: "Staff Engineer", name: "Ana Silva" },
        ],
      }),
    );
  },
};

/** A title in the job seeker's own words, long enough to wrap, with its category beside it. */
export const OwnTitle: Story = {
  args: {
    interview: { ...upcoming, category: "decision_maker", title: "Strategic Alignment with the Sr Director of Platform" },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Round 2 · Strategic Alignment with the Sr Director of Platform" }),
    ).toBeVisible();
    await expect(canvas.getByText("Decision Maker")).toBeVisible();
  },
};

/** Edit details turns the category, the title and the date into fields, with focus on Category. */
export const Editing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await expect(canvas.getByRole("combobox", { name: /^Category/ })).toHaveFocus();
    await expect(canvas.getByRole("textbox", { name: /^Title/ })).toHaveValue("Technical Deep-Dive");
  },
};

/** A new category and title save together on Save; a title the job seeker wrote stays as written. */
export const SaveCategoryAndTitle: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: /^Category/ }), "system_design");
    const title = canvas.getByRole("textbox", { name: /^Title/ });
    await expect(title).toHaveValue("Technical Deep-Dive");
    await userEvent.clear(title);
    await userEvent.type(title, "Retrospective System Design");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(actions.updateInterviewAction).toHaveBeenCalledWith("lumen", upcoming.id, {
        category: "system_design",
        title: "Retrospective System Design",
      }),
    );
  },
};

/** An Unscheduled Interview (BIG-221): no date yet, so the Interview the company confirmed but hasn't booked. */
const unscheduled = interview("leadership", {
  application_id: "lumen",
  category: "people_management",
  title: "Leadership",
  at: null,
  completed: false,
  participants: [{ id: "priya", role: "VP Engineering", name: "Priya Nair" }],
});

/** Unscheduled (BIG-221): "Date TBD" where the date would be, and a neutral "Upcoming · date TBD". */
export const Unscheduled: Story = {
  args: { app: { ...lumen, interviews: [completed, upcoming, unscheduled] }, interview: unscheduled },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Round 3 · Leadership" })).toBeVisible();
    await expect(canvas.getByText("Date TBD")).toBeVisible();
    await expect(canvas.getByText("Upcoming · date TBD")).toBeVisible();
  },
};

/** Opened from Add the date: Edit details is already open, with Date TBD on and the date and time disabled. */
export const AddTheDate: Story = {
  args: { ...Unscheduled.args, editOnOpen: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("switch", { name: "Date TBD" })).toBeChecked();
    await expect(canvas.getByRole("button", { name: /^Date, / })).toBeDisabled();
    await expect(canvas.getByLabelText("Time")).toBeDisabled();
  },
};

/** Date TBD turned off with no date: it asks for both, and sends nothing. */
export const DateTbdTurnedOff: Story = {
  args: AddTheDate.args,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("switch", { name: "Date TBD" }));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Enter the date and time, or turn on Date TBD.");
    await expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  },
};

/** Postponed with no new date: turning Date TBD on and saving makes it Unscheduled. */
export const Postpone: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    await userEvent.click(canvas.getByRole("switch", { name: "Date TBD" }));
    await expect(canvas.getByRole("button", { name: /^Date, / })).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(actions.updateInterviewAction).toHaveBeenCalledWith("lumen", upcoming.id, { at: null, noDate: true }),
    );
    await expect(await canvas.findByText("Upcoming · date TBD")).toBeVisible();
  },
};

/** The Leadership Interview of Lumen Bio once Rejected: it never took place, so it's Abandoned (BIG-222). */
const rejected = { ...lumen, status: "done" as const, outcome: "rejected" as const, interviews: [completed, upcoming, unscheduled] };

/** Abandoned (BIG-222): "No date" where the date would be, a grey "Didn't happen", and "Done · Rejected". */
export const Abandoned: Story = {
  args: { app: rejected, interview: unscheduled },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No date")).toBeVisible();
    await expect(canvas.getByText("Didn’t happen")).toBeVisible();
    await expect(canvas.getByText("Done · Rejected")).toBeVisible();
  },
};

/** Edit details on a Done Application: Didn't happen instead of Date TBD, on for an Abandoned Interview. */
export const AbandonedEditing: Story = {
  args: { ...Abandoned.args, editOnOpen: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("switch", { name: "Didn’t happen" })).toBeChecked();
    await expect(canvas.queryByRole("switch", { name: "Date TBD" })).not.toBeInTheDocument();
  },
};

/** An empty title isn't saved: it says why beside the field. */
export const EmptyTitle: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit details" }));
    const title = canvas.getByRole("textbox", { name: /^Title/ });
    await userEvent.clear(title);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Enter the title.");
    await expect(title).toHaveAccessibleDescription("Enter the title.");
    await expect(title).toHaveFocus();
    await expect(actions.updateInterviewAction).not.toHaveBeenCalled();
  },
};

/** ⋯ holds Delete Interview, which asks first. */
export const Delete: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^More actions/ }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Interview" }));
    await expect(await screen.findByRole("dialog", { name: "Delete Interview?" })).toBeVisible();
    await expect(actions.deleteInterviewAndLeaveAction).not.toHaveBeenCalled();
  },
};

/** On a phone, Edit details moves into ⋯, above Delete Interview. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^More actions/ }));
    await expect(await screen.findByRole("menuitem", { name: "Edit details" })).toBeVisible();
    await expect(screen.getByRole("menuitem", { name: "Delete Interview" })).toBeVisible();
  },
};
