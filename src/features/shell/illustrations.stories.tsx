import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { ComponentType } from "react";
import { expect, waitFor } from "storybook/test";
import * as illustrations from "./illustrations";

// Every Bigfoot sprite (BIG-225), each on a card the way the app shows them, in dark and light.
// The page stories show where each one sits; this one shows the whole library, placed or not.
const sprites = Object.entries(illustrations) as [string, ComponentType<{ className?: string }>][];

function Library() {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4 p-0">
      {sprites.map(([name, Sprite]) => (
        <li key={name} className="card flex flex-col items-center gap-3 p-4">
          <Sprite className="h-[120px] w-auto max-w-full object-contain" />
          <code className="text-sm text-body">{name}</code>
        </li>
      ))}
    </ul>
  );
}

const meta = {
  component: Library,
  play: async ({ canvasElement }) => {
    const images = Array.from(canvasElement.querySelectorAll("img"));
    await expect(images).toHaveLength(sprites.length);
    await expect(images.map((image) => image.getAttribute("alt"))).toEqual(sprites.map(() => ""));
    // Every file is there: a missing one loads with no width.
    await waitFor(() => expect(images.every((image) => image.complete && image.naturalWidth > 0)).toBe(true));
  },
} satisfies Meta<typeof Library>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The library on dark cards. */
export const Dark: Story = { globals: { theme: "dark" } };

/** The library on light cards. */
export const Light: Story = { globals: { theme: "light" } };
