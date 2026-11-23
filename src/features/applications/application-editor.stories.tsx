import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { previewApplications } from "@/lib/mock-data";
import { ApplicationEditor } from "./application-editor";

// The Application page's body, for Applications from the landing page's sample data. Server
// Actions are mocked (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const datadog = previewApplications.find((app) => app.id === "datadog")!;
const ramp = previewApplications.find((app) => app.id === "ramp")!;

const meta = {
  component: ApplicationEditor,
  args: { app: datadog },
  // What the Application page puts around the editor: a region named for the company.
  decorators: [
    (Story, { args }) => (
      <main className="max-w-2xl">
        <section aria-label={args.app.company}>{Story()}</section>
      </main>
    ),
  ],
} satisfies Meta<typeof ApplicationEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** In Progress, with a completed Interview and an upcoming one. */
export const Default: Story = {};

/** Done with an Offer. */
export const Offer: Story = { args: { app: ramp } };

/** Opened straight after adding the Application: the Interview list asks for the first Interview. */
export const JustAdded: Story = {
  args: { app: { ...datadog, interviews: [] }, justAdded: true },
};

/** A detail saves when it's left. */
export const SaveDetail: Story = {
  play: async ({ canvas, userEvent }) => {
    const title = canvas.getByRole("textbox", { name: /^Title/ });
    await userEvent.clear(title);
    await userEvent.type(title, "Senior Software Engineer");
    await userEvent.tab();
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith(
        "datadog",
        expect.objectContaining({ title: "Senior Software Engineer" }),
      ),
    );
  },
};

/** A required detail left blank shows its error and isn't sent. */
export const DetailError: Story = {
  play: async ({ canvas, userEvent }) => {
    const company = canvas.getByRole("textbox", { name: /^Company/ });
    await userEvent.clear(company);
    await userEvent.tab();
    await expect(company).toHaveAttribute("aria-invalid", "true");
    await expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  },
};

/** The server refuses a save: the error and a Retry show beside the field. */
export const SaveFails: Story = {
  beforeEach: () => {
    mocked(actions.updateApplicationAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    const title = canvas.getByRole("textbox", { name: /^Title/ });
    await userEvent.type(title, " II");
    await userEvent.tab();
    await expect(await canvas.findByRole("button", { name: "Retry, Title" })).toBeVisible();
  },
};

export const LongText: Story = {
  args: {
    app: {
      ...datadog,
      company: "Northern Lights Software Engineering Co-operative of British Columbia",
      title: "Senior Staff Software Engineer, Developer Experience and Internal Platform Tooling",
      location: "Remote within Canada, with quarterly visits to the Vancouver, Toronto or Montréal office",
      posting_url: "https://example.com/careers/engineering/platform/senior-staff-software-engineer-developer-experience",
    },
  },
};
