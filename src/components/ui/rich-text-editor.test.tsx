import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { replaceRich, richValue, typeKeys, typeRich } from "@/test/rich-text";
import { FORMATS, RichTextEditor } from "./rich-text-editor";

// Typing for real, with the keyboard shortcuts and "# " at a line's start, is checked in Chrome by
// the stories' play functions: happy-dom's editing is too thin for ProseMirror (src/test/rich-text.ts).

const ignore = () => {};

function Host({ initial = "", error, onChange = ignore }: { initial?: string; error?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <span id="label">Notes</span>
      <RichTextEditor
        id="notes"
        value={value}
        onChange={(markdown) => {
          setValue(markdown);
          onChange(markdown);
        }}
        labelledBy="label"
        errorId="notes-error"
        error={error}
        placeholder="Write here"
      />
      <button type="button" onClick={() => setValue("Set **elsewhere**")}>
        Replace
      </button>
    </>
  );
}

const field = () => screen.getByRole("textbox", { name: "Notes" });
const toolbar = () => screen.getByRole("toolbar", { name: "Formatting" });

describe("RichTextEditor", () => {
  it("shows its Markdown formatted, as a multi-line textbox named by its label", async () => {
    render(<Host initial={"# Title\n\n**bold** <u>under</u>\n\n1. one"} />);
    // A title in the field is a paragraph marked with its size, out of the page's outline.
    await waitFor(() => expect(within(field()).getByText("Title")).toHaveAttribute("data-title", "1"));
    expect(within(field()).queryByRole("heading")).not.toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-multiline", "true");
    expect(within(field()).getByText("bold").tagName).toBe("STRONG");
    expect(within(field()).getByText("under").tagName).toBe("U");
    expect(within(field()).getByRole("list").tagName).toBe("OL");
  });

  it("has a labelled toolbar button for each format, none pressed in plain text", async () => {
    render(<Host />);
    const buttons = within(toolbar()).getAllByRole("button");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Large title",
      "Medium title",
      "Small title",
      "Bold",
      "Italic",
      "Underline",
      "Bulleted list",
      "Numbered list",
    ]);
    await waitFor(() => expect(buttons[0]).toBeEnabled());
    for (const button of buttons) expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-keyshortcuts", "Control+B Meta+B");
    expect(toolbar()).toHaveAttribute("aria-controls", "notes");
  });

  it.each([
    ["Large title", "# Notes"],
    ["Medium title", "## Notes"],
    ["Small title", "### Notes"],
    ["Bulleted list", "- Notes"],
    ["Numbered list", "1. Notes"],
  ])("formats the line with %s, pressing the button, and reports the Markdown", async (label, markdown) => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Host onChange={onChange} />);
    await typeRich(field(), "Notes");
    await user.click(screen.getByRole("button", { name: label }));
    expect(onChange).toHaveBeenLastCalledWith(markdown);
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["# ", "# Notes", "Large title"],
    ["## ", "## Notes", "Medium title"],
    ["### ", "### Notes", "Small title"],
    ["- ", "- Notes", "Bulleted list"],
    ["1. ", "1. Notes", "Numbered list"],
  ])("starts a line with %j for its format", async (start, markdown, label) => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    await typeKeys(field(), `${start}Notes`);
    expect(onChange).toHaveBeenLastCalledWith(markdown);
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["Bold", "**Notes**"],
    ["Italic", "*Notes*"],
    ["Underline", "<u>Notes</u>"],
  ])("marks what's selected with %s", async (label, markdown) => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Host initial="Notes" onChange={onChange} />);
    await waitFor(() => expect(field()).toHaveProperty("editor"));
    act(() => (field() as HTMLElement & { editor: { commands: { selectAll: () => void } } }).editor.commands.selectAll());
    await user.click(screen.getByRole("button", { name: label }));
    expect(onChange).toHaveBeenLastCalledWith(markdown);
    expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  });

  it("stores typed characters so they read back as typed", async () => {
    render(<Host />);
    await typeRich(field(), "5*3 & a_b <b>not bold</b>");
    expect(await richValue(field())).toBe("5\\*3 & a\\_b \\<b\\>not bold\\</b\\>");
  });

  it("loads a value changed from outside, without reporting it as a change", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Host initial="First" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Replace" }));
    await waitFor(() => expect(within(field()).getByText("elsewhere").tagName).toBe("STRONG"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps what's being written when its own change comes back as the value", async () => {
    render(<Host />);
    await replaceRich(field(), "Typed");
    await typeRich(field(), " more");
    expect(await richValue(field())).toBe("Typed more");
  });

  it("never loads a value it reported over newer typing, when the page catches up late", async () => {
    const onChange = vi.fn();
    const props = { id: "notes", onChange, labelledBy: "label", errorId: "notes-error" };
    const { rerender } = render(
      <>
        <span id="label">Notes</span>
        <RichTextEditor {...props} value="" />
      </>,
    );
    await typeRich(field(), "R");
    await typeRich(field(), "e");
    // The page renders with the first keystroke's value after the second was typed.
    rerender(
      <>
        <span id="label">Notes</span>
        <RichTextEditor {...props} value="R" />
      </>,
    );
    expect(await richValue(field())).toBe("Re");
    // A value from elsewhere still replaces it.
    rerender(
      <>
        <span id="label">Notes</span>
        <RichTextEditor {...props} value="Saved elsewhere" />
      </>,
    );
    await waitFor(() => expect(field()).toHaveTextContent("Saved elsewhere"));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("loads HTML in notes as its text, other than underline", async () => {
    render(<Host initial={"Vec<T> and <b>x</b>\n\n<script>alert(1)</script>"} />);
    await waitFor(() => expect(field()).toHaveTextContent("Vec<T> and <b>x</b>"));
    expect(field()).toHaveTextContent("<script>alert(1)</script>");
    // eslint-disable-next-line testing-library/no-node-access -- checking no element was made.
    expect(field().querySelectorAll("b, script")).toHaveLength(0);
  });

  it("is tied to its error while it has one", async () => {
    const { rerender } = render(<Host error="Too long" />);
    await waitFor(() => expect(field()).toHaveAttribute("aria-invalid", "true"));
    expect(field()).toHaveAttribute("aria-describedby", "notes-error");
    rerender(<Host />);
    await waitFor(() => expect(field()).not.toHaveAttribute("aria-invalid"));
    expect(field()).not.toHaveAttribute("aria-describedby");
  });

  it("shows its placeholder while empty", async () => {
    render(<Host />);
    await waitFor(() =>
      // eslint-disable-next-line testing-library/no-node-access -- the placeholder is an attribute on the empty paragraph.
      expect(field().querySelector("p")).toHaveAttribute("data-placeholder", "Write here"),
    );
  });

  it("lists each format once", () => {
    expect(new Set(FORMATS.map((format) => format.name)).size).toBe(FORMATS.length);
  });
});
