import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, waitFor } from "storybook/test";
import { createApplicationAction } from "@/app/applications/actions";
import { NewApplicationForm } from "./new-application-form";

// The Add Application page's form. Server Actions are mocked
// (src/app/applications/__mocks__/actions.ts) and succeed unless a story says otherwise.
const meta = {
  component: NewApplicationForm,
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
} satisfies Meta<typeof NewApplicationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty, with Applied at today. */
export const Default: Story = {};

/** The details, trimmed, create the Application. */
export const Add: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: /^Company/ }), " Shopify ");
    await userEvent.type(canvas.getByRole("textbox", { name: /^Title/ }), "Senior Developer");
    await userEvent.click(canvas.getByRole("radio", { name: "Remote" }));
    await userEvent.click(canvas.getByRole("button", { name: "Add Application" }));
    await waitFor(() =>
      expect(createApplicationAction).toHaveBeenCalledWith(
        expect.objectContaining({ company: "Shopify", title: "Senior Developer", location: "remote" }),
      ),
    );
  },
};

/** Adding with nothing filled in shows each missing detail's error and sends nothing. */
export const MissingDetails: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add Application" }));
    await expect(canvas.getByRole("textbox", { name: /^Company/ })).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("textbox", { name: /^Title/ })).toHaveAttribute("aria-invalid", "true");
    await expect(createApplicationAction).not.toHaveBeenCalled();
  },
};

/** The server refuses: the form stays, with the reason. */
export const AddFails: Story = {
  beforeEach: () => {
    mocked(createApplicationAction).mockResolvedValue({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("textbox", { name: /^Company/ }), "Shopify");
    await userEvent.type(canvas.getByRole("textbox", { name: /^Title/ }), "Senior Developer");
    await userEvent.click(canvas.getByRole("button", { name: "Add Application" }));
    await expect(await canvas.findByText(/Couldn’t reach Bigfoot’s server/)).toBeVisible();
  },
};
