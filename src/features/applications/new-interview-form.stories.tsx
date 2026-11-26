import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor, within } from "storybook/test";
import { createInterviewAction } from "@/app/applications/actions";
import { previewApplications } from "@/lib/mock-data";
import { NewInterviewForm } from "./new-interview-form";

// The Add Interview page's form, for the landing page's sample Applications. Server Actions are
// mocked (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const meta = {
  component: NewInterviewForm,
  args: { applications: previewApplications() },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof NewInterviewForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opened from the dashboard: no Application chosen, In Progress ones first, then Done. */
export const Default: Story = {};

/** Opened from an Application page's Add Interview: that Application is already chosen. */
export const FromApplication: Story = { args: { applicationId: "datadog" } };

/** With no Applications, it explains that an Interview needs one. */
export const NoApplications: Story = { args: { applications: [] } };

/** Adding with nothing filled in shows each missing field's error, focuses the first, and sends nothing. */
export const MissingFields: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add Interview" }));
    await expect(canvas.getByRole("combobox", { name: /^Application/ })).toHaveFocus();
    await expect(canvas.getByRole("button", { name: /^Date, / })).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("group", { name: "Who you’re meeting" })).toHaveAccessibleDescription(
      "Add at least one person you’re meeting.",
    );
    await expect(createInterviewAction).not.toHaveBeenCalled();
  },
};

/**
 * The category (its name filling in the title), a title in the job seeker's words, the date and
 * time, who they're meeting (someone already met at Datadog, and someone new), and How it went
 * create the Interview.
 */
export const Add: Story = {
  args: { applicationId: "datadog" },
  play: async ({ canvas, userEvent }) => {
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: /^Category/ }), "system_design");
    const title = canvas.getByRole("textbox", { name: /^Title/ });
    await expect(title).toHaveValue("System Design");
    await userEvent.clear(title);
    await userEvent.type(title, "Retrospective System Design");
    await userEvent.click(canvas.getByRole("button", { name: /^Date, / }));
    await userEvent.click(within(await screen.findByRole("grid")).getByText("15"));
    await userEvent.type(canvas.getByLabelText("Time"), "14:30");
    await userEvent.type(canvas.getByRole("textbox", { name: "Role" }), "Staff Engineer");
    await userEvent.selectOptions(canvas.getByRole("combobox", { name: "Add someone you’ve met" }), "datadog-Senior Engineer-Priya Shah");
    await userEvent.type(canvas.getByRole("textbox", { name: "How it went" }), "Bring the system design notes");
    await userEvent.click(canvas.getByRole("button", { name: "Add Interview" }));
    await waitFor(() =>
      expect(createInterviewAction).toHaveBeenCalledWith(
        "datadog",
        expect.objectContaining({
          category: "system_design",
          title: "Retrospective System Design",
          how_it_went: "Bring the system design notes",
          participants: [
            { role: "Staff Engineer", name: null },
            { id: "datadog-Senior Engineer-Priya Shah", role: "Senior Engineer", name: "Priya Shah" },
          ],
        }),
      ),
    );
  },
};

/** The server refuses: the form stays, with the reason. */
export const AddFails: Story = {
  args: { applicationId: "datadog" },
  beforeEach: () => {
    mocked(createInterviewAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^Date, / }));
    await userEvent.click(within(await screen.findByRole("grid")).getByText("15"));
    await userEvent.type(canvas.getByLabelText("Time"), "09:00");
    await userEvent.type(canvas.getByRole("textbox", { name: "Role" }), "Recruiter");
    await userEvent.click(canvas.getByRole("button", { name: "Add Interview" }));
    await expect(await canvas.findByText(/Couldn’t reach Bigfoot’s server/)).toBeVisible();
  },
};

/** Long company names and roles in the Application choice. */
export const LongText: Story = {
  args: {
    applicationId: "long",
    applications: [
      {
        ...previewApplications()[0],
        id: "long",
        company: "Northern Lights Software Engineering Co-operative of British Columbia",
        title: "Senior Staff Software Engineer, Developer Experience and Internal Platform Tooling",
      },
    ],
  },
};
