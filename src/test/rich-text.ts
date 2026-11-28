import { act, waitFor } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { readableMarkdown } from "@/components/ui/markdown";

/**
 * Writing in a RichTextEditor from a component test. happy-dom's editing is too thin for
 * ProseMirror to read typed keys reliably, so these go through the editor itself, as typing does,
 * and Storybook's play functions type for real in Chrome.
 */

/** The Tiptap editor behind a RichTextEditor's field (its role="textbox" element). */
async function editorOf(field: HTMLElement): Promise<Editor> {
  await waitFor(() => {
    if (!("editor" in field)) throw new Error("The editor hasn't started yet");
  });
  return (field as HTMLElement & { editor: Editor }).editor;
}

/**
 * Types `text` at the end of the field, as the job seeker would: each "\n" starts a new paragraph
 * (Enter). Text is inserted as text, so "<b>" is typed, not parsed.
 */
export async function typeRich(field: HTMLElement, text: string) {
  const editor = await editorOf(field);
  act(() => {
    text.split("\n").forEach((line, index) => {
      const chain = editor.chain().focus("end");
      if (index > 0) chain.splitBlock();
      if (line) chain.insertContent({ type: "text", text: line });
      chain.run();
    });
  });
}

/**
 * Types `text` key by key at the end of the field through ProseMirror's own text-input path, so
 * what typing at a line's start does ("# " starts a title, "1. " a numbered list) happens.
 */
export async function typeKeys(field: HTMLElement, text: string) {
  const editor = await editorOf(field);
  act(() => {
    editor.commands.focus("end");
    for (const key of text) {
      const { view } = editor;
      const { from, to } = view.state.selection;
      const handled = view.someProp("handleTextInput", (handle) => handle(view, from, to, key, () => view.state.tr));
      if (!handled) view.dispatch(view.state.tr.insertText(key, from, to));
    }
  });
}

/** Replaces everything in the field with `markdown`, as pasting over a selection of it all would. */
export async function replaceRich(field: HTMLElement, markdown: string) {
  const editor = await editorOf(field);
  act(() => {
    editor.chain().focus().setContent(markdown, { contentType: "markdown", emitUpdate: true }).run();
  });
}

/** What the field holds, as the Markdown it saves. */
export async function richValue(field: HTMLElement): Promise<string> {
  return readableMarkdown((await editorOf(field)).getMarkdown());
}
