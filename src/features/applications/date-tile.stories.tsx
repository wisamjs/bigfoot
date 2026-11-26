import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { DateTile } from "./date-tile";

// An Interview's month and day, as the Interviews list and the Next interview card show it beside
// the written-out date. Midday UTC, so the tile reads the 25th in every time zone from UTC−11 to
// UTC+11. The tile is aria-hidden, so the play functions find it by its text.
const at = "2026-11-25T12:00:00Z";
const month = new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(at));

const meta = {
  component: DateTile,
  args: { at, tone: "outline" },
  argTypes: { tone: { control: "inline-radio", options: ["brand", "outline", "muted"] } },
  // On a card, as in the app: the muted tile is filled with the page's surface colour.
  decorators: [(Story) => <div className="inline-flex rounded-card bg-card p-5">{Story()}</div>],
} satisfies Meta<typeof DateTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An Interview still ahead: outlined. */
export const Outline: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(month)).toBeVisible();
    await expect(canvas.getByText("25")).toBeVisible();
  },
};

/** The next Interview, filled with the brand colour (the Next interview card). */
export const Brand: Story = { args: { tone: "brand" } };

/** A completed Interview: filled with the surface colour, no outline. */
export const Muted: Story = { args: { tone: "muted" } };

/** The three tones side by side, as a list of Interviews mixes them. */
export const Tones: Story = {
  render: (args) => (
    <div className="flex gap-3">
      <DateTile {...args} tone="brand" />
      <DateTile {...args} tone="outline" />
      <DateTile {...args} tone="muted" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText("25")).toHaveLength(3);
  },
};
