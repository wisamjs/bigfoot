import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ComponentProps } from "react";
import { expect, fn, waitFor, within } from "storybook/test";
import { FieldError } from "./field-error";
import { RichTextEditor } from "./rich-text-editor";

/** The editor under a label, holding its value as a form would, with its error under it. */
function Labelled(props: ComponentProps<typeof RichTextEditor>) {
  const [value, setValue] = useState(props.value);
  return (
    <div className="flex max-w-xl flex-col gap-1.5">
      <span id="notes-label" className="text-sm font-bold text-heading">
        How it went
      </span>
      <RichTextEditor
        {...props}
        value={value}
        onChange={(markdown) => {
          setValue(markdown);
          props.onChange(markdown);
        }}
      />
      <FieldError id={props.errorId} error={props.error} />
    </div>
  );
}

const meta = {
  component: RichTextEditor,
  render: (args) => <Labelled {...args} />,
  args: {
    id: "notes",
    value: "",
    onChange: fn(),
    onBlur: fn(),
    labelledBy: "notes-label",
    errorId: "notes-error",
    placeholder: "What landed, what didn't",
  },
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty: the placeholder, and no format pressed. */
export const Empty: Story = {
  play: async ({ canvas }) => {
    const toolbar = canvas.getByRole("toolbar", { name: "Formatting" });
    await waitFor(() => expect(within(toolbar).getByRole("button", { name: "Bold" })).toBeEnabled());
    await expect(within(toolbar).getAllByRole("button").map((button) => button.getAttribute("aria-pressed"))).toEqual(
      Array(8).fill("false"),
    );
  },
};

/** Every format: three sizes of title, bold, italics, underline, and both lists. */
export const Formatted: Story = {
  args: {
    value:
      "# Round one\n\n## What landed\n\n**Strong** on the *incident story*, <u>weak</u> on the roadmap.\n\n### Next time\n\n1. Lead with the decision\n2. Then the trade-off\n\n- Bring numbers\n- Draw first",
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("weak")).toBeVisible();
  },
};

/**
 * Typing for real: a title from the toolbar, Bold from the toolbar, "- " starts a list; it reports
 * Markdown. ("# " and "1. " are checked in rich-text-editor.test.tsx: Testing Library's typing edits
 * the page behind the editor's back, which it can't follow once "# " has turned the line into a title.)
 */
export const Typing: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const field = canvas.getByRole("textbox", { name: "How it went" });
    await userEvent.click(field);
    await userEvent.click(canvas.getByRole("button", { name: "Large title" }));
    await userEvent.keyboard("Round one{Enter}");
    await expect(canvas.getByRole("button", { name: "Large title" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(canvas.getByRole("button", { name: "Bold" }));
    await userEvent.keyboard("Strong");
    await expect(canvas.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Bold" }));
    await userEvent.keyboard(" start{Enter}- Send a thank-you");
    await expect(canvas.getByRole("button", { name: "Bulleted list" })).toHaveAttribute("aria-pressed", "true");
    await expect(args.onChange).toHaveBeenLastCalledWith("# Round one\n\n**Strong** start\n\n- Send a thank-you");
  },
};

/** Cmd or Ctrl with B, I and U format what's selected. */
export const Shortcuts: Story = {
  args: { value: "Notes" },
  play: async ({ args, canvas, userEvent }) => {
    const field = canvas.getByRole("textbox", { name: "How it went" });
    await userEvent.click(field);
    const mod = navigator.platform.startsWith("Mac") ? "Meta" : "Control";
    await userEvent.keyboard(`{${mod}>}a{/${mod}}`);
    await userEvent.keyboard(`{${mod}>}b{/${mod}}`);
    await userEvent.keyboard(`{${mod}>}i{/${mod}}`);
    await userEvent.keyboard(`{${mod}>}u{/${mod}}`);
    await expect(args.onChange).toHaveBeenLastCalledWith("***<u>Notes</u>***");
    await expect(
      ["Bold", "Italic", "Underline"].map((name) => canvas.getByRole("button", { name }).getAttribute("aria-pressed")),
    ).toEqual(["true", "true", "true"]);
  },
};

/** The toolbar is one tab stop; arrow keys move along it. */
export const ToolbarKeyboard: Story = {
  play: async ({ canvas, userEvent }) => {
    await waitFor(() => expect(canvas.getByRole("button", { name: "Large title" })).toBeEnabled());
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Large title" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Bold" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("textbox", { name: "How it went" })).toHaveFocus();
  },
};

/** An error: the field is outlined in the danger colour and names its error. */
export const WithError: Story = {
  args: { value: "Notes", error: "How it went can be at most 20,000 characters." },
  play: async ({ canvas }) => {
    const field = canvas.getByRole("textbox", { name: "How it went" });
    await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"));
    await expect(field).toHaveAccessibleDescription("How it went can be at most 20,000 characters.");
  },
};

/** Long notes scroll inside the field once it reaches its height. */
export const LongText: Story = {
  args: { value: Array.from({ length: 30 }, (_, n) => `- Point ${n + 1}: something that went well or didn't`).join("\n") },
};
