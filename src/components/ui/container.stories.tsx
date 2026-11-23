import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Container } from "./container";

const meta = {
  component: Container,
  parameters: { layout: "fullscreen" },
  args: {
    children: <div className="card p-6 text-sm">Content stays within 1152px, centred, with 24px either side.</div>,
  },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongText: Story = {
  args: {
    children: (
      <p className="m-0">
        {"Job hunting is chasing Bigfoot. Track every application, interview and follow-up in one place until you find yours. ".repeat(
          8,
        )}
      </p>
    ),
  },
};
