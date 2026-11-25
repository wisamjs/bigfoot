import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { application, interview } from "@/test/applications";
import { InterviewHeading } from "./interview-heading";

// The Interview page's heading (BIG-178). Dates are counted from today, so the badge reads as it
// would on the page. Server Actions are mocked (src/app/applications/__mocks__/actions.ts) and
// succeed unless a story says otherwise.
const DAY = 86_400_000;
const daysFromNow = (days: number, hour = 15) => {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const upcoming = interview("deep-dive", {
  application_id: "lumen",
  category: "project_deep_dive",
  title: "Technical Deep-Dive",
  at: daysFromNow(2, 11),
  completed: false,
});
const completed = interview("manager", { application_id: "lumen", category: "hiring_manager", title: "Hiring Manager", at: daysFromNow(-10, 11) });
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
 * Coming up: its title, its date and time with the year, and its category tag beside a blue
 * "Upcoming · in 2 days".
 */
export const Upcoming: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Technical Deep-Dive" })).toBeVisible();
    await expect(canvas.getByText("Project Deep-dive")).toBeVisible();
    await expect(await canvas.findByText("Upcoming · in 2 days")).toBeVisible();
  },
};

/** Past: a green "Completed · 10 days ago". */
export const Completed: Story = {
  args: { interview: completed },
  play: async ({ canvas }) => {
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

/** A title in the job seeker's own words, long enough to wrap, with its category beside it. */
export const OwnTitle: Story = {
  args: {
    interview: { ...upcoming, category: "decision_maker", title: "Strategic Alignment with the Sr Director of Platform" },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Strategic Alignment with the Sr Director of Platform" }),
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
