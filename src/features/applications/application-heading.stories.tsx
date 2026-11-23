import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor } from "storybook/test";
import * as actions from "@/app/applications/actions";
import { previewApplications } from "@/lib/mock-data";
import { ApplicationHeading } from "./application-heading";

// The Application page's heading, for an Application from the landing page's sample data. Server
// Actions are mocked (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const datadog = previewApplications.find((app) => app.id === "datadog")!;

const meta = {
  component: ApplicationHeading,
  args: { app: datadog },
} satisfies Meta<typeof ApplicationHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The edit button turns the company and title into fields, with focus on Company. */
export const Editing: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit company and title" }));
    await expect(canvas.getByRole("textbox", { name: /^Company/ })).toHaveFocus();
  },
};

/** Enter saves both together. */
export const SaveBoth: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit company and title" }));
    const title = canvas.getByRole("textbox", { name: /^Title/ });
    await userEvent.clear(title);
    await userEvent.type(title, "Senior Software Engineer{Enter}");
    await waitFor(() =>
      expect(actions.updateApplicationAction).toHaveBeenCalledWith(
        "datadog",
        expect.objectContaining({ title: "Senior Software Engineer" }),
      ),
    );
  },
};

/** A required field left blank shows its error and isn't sent. */
export const BlankCompany: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit company and title" }));
    const company = canvas.getByRole("textbox", { name: /^Company/ });
    await userEvent.clear(company);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(company).toHaveAttribute("aria-invalid", "true");
    await expect(actions.updateApplicationAction).not.toHaveBeenCalled();
  },
};

/** The server refuses a save: what was typed stays, with the error and a Retry. */
export const SaveFails: Story = {
  beforeEach: () => {
    mocked(actions.updateApplicationAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit company and title" }));
    await userEvent.type(canvas.getByRole("textbox", { name: /^Title/ }), " II{Enter}");
    await expect(await canvas.findByRole("textbox", { name: /^Title/ })).toHaveValue(`${datadog.title} II`);
  },
};
