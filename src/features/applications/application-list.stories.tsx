import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, screen, waitFor } from "storybook/test";
import { updateApplicationAction } from "@/app/applications/actions";
import { previewApplications } from "@/lib/mock-data";
import { ApplicationList } from "./application-list";

// The dashboard's Applications, from the landing page's sample data. Server Actions are mocked
// (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const meta = {
  component: ApplicationList,
  args: { applications: previewApplications, linked: true },
  // A page around the list, as the dashboard has: the menus open inside its main landmark.
  decorators: [(Story) => <main className="max-w-3xl">{Story()}</main>],
} satisfies Meta<typeof ApplicationList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grouped by what each Application is waiting on, with jump chips to each group. */
export const Default: Story = {};

export const Empty: Story = { args: { applications: [] } };

/** Sample Applications, which a new job seeker starts with, carry a Sample badge. */
export const Sample: Story = {
  args: { applications: previewApplications.map((app) => ({ ...app, is_sample: true })) },
};

/** Marking an Outcome from a card's menu saves it with the Application's id. */
export const ChangeStatus: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Change Status, Stripe" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Mark Rejected" }));
    await waitFor(() =>
      expect(updateApplicationAction).toHaveBeenCalledWith("stripe", { status: "done", outcome: "rejected" }),
    );
  },
};

/** A save that fails shows its error and a Retry on the card. */
export const ChangeStatusFails: Story = {
  beforeEach: () => {
    mocked(updateApplicationAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Change Status, Stripe" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Mark Rejected" }));
    await expect(await canvas.findByRole("button", { name: "Retry, Status, Stripe" })).toBeVisible();
  },
};

/** Long company names and titles wrap inside the card. */
export const LongText: Story = {
  args: {
    applications: previewApplications.map((app, i) =>
      i === 0
        ? {
            ...app,
            company: "Northern Lights Software Engineering Co-operative of British Columbia",
            title: "Senior Staff Software Engineer, Developer Experience and Internal Platform Tooling",
          }
        : app,
    ),
  },
};

/** The landing page's decorative copy: hidden from screen readers, not interactive. */
export const Decorative: Story = { args: { linked: false, decorative: true } };
