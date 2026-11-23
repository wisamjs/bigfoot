import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionHeader } from "./section-header";

const meta = {
  component: SectionHeader,
  args: {
    id: "features",
    title: "Everything in one place",
    lead: "Every Application, Interview and follow-up, from the first message to the Offer.",
  },
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongText: Story = {
  args: {
    title: "Stop losing track of which company you’re waiting to hear back from this week",
    lead: "Bigfoot groups your Applications by what they’re waiting on, so the next thing to do is always at the top. ".repeat(
      2,
    ),
  },
};
