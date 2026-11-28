import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { MarkdownView } from "./markdown-view";

const meta = {
  component: MarkdownView,
  args: {
    markdown:
      "# Round one\n\n## What landed\n\n**Strong** on the *incident story*, <u>weak</u> on the roadmap.\n\n### Next time\n\n1. Lead with the decision\n2. Then the trade-off\n\n- Bring numbers\n- Draw first",
    className: "max-w-xl text-base leading-[1.7] text-heading",
  },
  decorators: [
    (Story) => (
      <section aria-labelledby="card" className="card flex max-w-2xl flex-col gap-4 p-6">
        <h2 id="card" className="m-0 text-2xl font-bold text-heading">
          Interview notes
        </h2>
        {Story()}
      </section>
    ),
  ],
} satisfies Meta<typeof MarkdownView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every format notes can hold: three sizes of title, all one level under the card, bold, italics, underline and lists. */
export const Formatted: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    await expect(canvas.getByText("weak").tagName).toBe("U");
  },
};

/** Notes written before formatting: each line on its own, and lines starting "- " as a list. */
export const PlainText: Story = {
  args: { markdown: "Asked about caching.\nThen queues.\n\n- Send a thank-you\n- Ask about on-call\nDone." },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2);
    await expect(canvas.getByText("Done.").tagName).toBe("P");
  },
};

/** What a job seeker types shows as text: HTML, links and images go nowhere. */
export const TypedHtml: Story = {
  args: { markdown: '<script>alert(1)</script> [link](https://example.com) <img src=x onerror="alert(1)">' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
    await expect(canvas.getByText(/<script>alert\(1\)<\/script>/)).toBeVisible();
  },
};

/** Long text wraps, a long word too. */
export const LongText: Story = {
  args: {
    markdown: `# ${"A very long title that keeps going ".repeat(4)}\n\n${"Supercalifragilisticexpialidocious".repeat(4)} and ${"words ".repeat(80)}`,
  },
  play: async ({ canvas }) => {
    await expect(within(canvas.getByRole("region")).getByRole("heading", { level: 3 })).toBeVisible();
  },
};
