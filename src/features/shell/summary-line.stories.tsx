import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { SummaryLine } from "./summary-line";

// The line under a page's heading: the counts that aren't zero.

const meta = {
  component: SummaryLine,
  args: {
    counts: [
      { id: "offers", text: "1 Offer to decide" },
      { id: "interviews", text: "4 Interviews in the next 2 weeks" },
      { id: "waiting", text: "2 waiting to hear back" },
    ],
  },
} satisfies Meta<typeof SummaryLine>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every count above zero, the Offer in the success colour. */
export const AllCounts: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent("1 Offer to decide · 4 Interviews in the next 2 weeks · 2 waiting to hear back");
  },
};

/** No Offers: the count at zero is left out. */
export const NoOffers: Story = {
  args: {
    counts: [
      { id: "interviews", text: "1 Interview in the next 2 weeks" },
      { id: "waiting", text: "3 waiting to hear back" },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent("1 Interview in the next 2 weeks · 3 waiting to hear back");
    await expect(canvasElement).not.toHaveTextContent("Offer");
  },
};

/** Only Applications waiting to hear back. */
export const OnlyWaiting: Story = { args: { counts: [{ id: "waiting", text: "1 waiting to hear back" }] } };

/** Every count at zero: no line. */
export const AllZero: Story = {
  args: { counts: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toBeEmptyDOMElement();
  },
};

/** Unscheduled Interviews (BIG-221): "N awaiting a date" follows the Interviews count. */
export const AwaitingADate: Story = {
  args: {
    counts: [
      { id: "interviews", text: "2 Interviews in the next 2 weeks" },
      { id: "awaiting", text: "2 awaiting a date" },
      { id: "waiting", text: "1 waiting to hear back" },
    ],
  },
};

/** The Applications page's line (BIG-252): In Progress, Offers in the success colour, and Done. */
export const Applications: Story = {
  args: {
    counts: [
      { id: "in-progress", text: "12 In Progress" },
      { id: "offers", text: "1 Offer" },
      { id: "done", text: "4 Done" },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent("12 In Progress · 1 Offer · 4 Done");
  },
};
