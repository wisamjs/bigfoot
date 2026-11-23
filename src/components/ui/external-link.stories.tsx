import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { ExternalLink } from "./external-link";

const meta = {
  component: ExternalLink,
  args: {
    href: "https://example.com/careers/software-engineer",
    children: "View the posting",
    className: "text-fg-brand underline underline-offset-2 hover:text-heading",
  },
} satisfies Meta<typeof ExternalLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "View the posting" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  },
};

export const Hovered: Story = { parameters: { pseudo: { hover: true } } };
export const Focused: Story = { parameters: { pseudo: { focusVisible: true } } };

/** A typed `javascript:` URL renders nothing at all. */
export const UnsafeUrl: Story = {
  // eslint-disable-next-line no-script-url -- the payload this story proves is dropped
  args: { href: "javascript:alert(1)" },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
  },
};

export const LongText: Story = {
  args: {
    href: "https://example.com/careers/engineering/platform/senior-software-engineer-developer-experience-remote-canada",
    children: "https://example.com/careers/engineering/platform/senior-software-engineer-developer-experience-remote-canada",
    className: "break-all text-fg-brand underline underline-offset-2",
  },
  decorators: [(Story) => <div className="max-w-xs">{Story()}</div>],
};
