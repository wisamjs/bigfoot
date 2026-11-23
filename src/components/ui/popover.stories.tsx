import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, waitFor } from "storybook/test";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "./popover";

const meta = {
  component: Popover,
  args: { children: null },
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="secondary">What’s Waiting?</Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="What’s Waiting?">
        <PopoverHeader>
          <PopoverTitle>Waiting</PopoverTitle>
          <PopoverDescription>An Application with no Interview booked yet.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "What’s Waiting?" }));
    const description = await screen.findByText("An Application with no Interview booked yet.");
    // After the fade-in.
    await waitFor(() => expect(description).toBeVisible());
  },
};

export const LongText: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="secondary">What’s Waiting?</Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="What’s Waiting?">
        <PopoverHeader>
          <PopoverTitle>Waiting on a reply from the company after the final round</PopoverTitle>
          <PopoverDescription>
            {"An Application with no Interview booked yet stays Waiting until you add one or mark it Done. ".repeat(3)}
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};
