"use client";

import Heading from "@tiptap/extension-heading";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, mergeAttributes, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading1, Heading2, Heading3, Italic, List, ListOrdered, Underline, type LucideIcon } from "lucide-react";
import { Toolbar } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";
import { invalidProps } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import { readableMarkdown } from "@/components/ui/markdown";

/** One formatting button: its label, its shortcut if it has one, icon, whether it's on, and what it does. */
type Format = {
  name: string;
  label: string;
  /** For aria-keyshortcuts and the tooltip: the letter pressed with Ctrl, or ⌘ on a Mac. */
  key?: string;
  icon: LucideIcon;
  active: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const title = (level: 1 | 2 | 3, label: string, icon: LucideIcon): Format => ({
  name: `title-${level}`,
  label,
  icon,
  active: (editor) => editor.isActive("heading", { level }),
  run: (editor) => editor.chain().focus().toggleHeading({ level }).run(),
});

const TITLES: Format[] = [
  title(1, "Large title", Heading1),
  title(2, "Medium title", Heading2),
  title(3, "Small title", Heading3),
];

const MARKS: Format[] = [
  {
    name: "bold",
    label: "Bold",
    key: "B",
    icon: Bold,
    active: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    name: "italic",
    label: "Italic",
    key: "I",
    icon: Italic,
    active: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    name: "underline",
    label: "Underline",
    key: "U",
    icon: Underline,
    active: (editor) => editor.isActive("underline"),
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
];

const LISTS: Format[] = [
  {
    name: "bullet-list",
    label: "Bulleted list",
    icon: List,
    active: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    name: "ordered-list",
    label: "Numbered list",
    icon: ListOrdered,
    active: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
];

/** The toolbar's groups, in order: titles, then bold, italics and underline, then lists. */
const GROUPS = [TITLES, MARKS, LISTS];
export const FORMATS = GROUPS.flat();

/**
 * A title in the field is a paragraph marked with its size, not an h1 to h3: the field sits under
 * a card's own heading, and the page's outline isn't the place for a title being written. The read
 * view puts titles in the outline, under the card (markdown-view.tsx). Stored as `#` to `###`.
 */
const Title = Heading.extend({
  parseHTML() {
    return [
      ...(this.parent?.() ?? []),
      { tag: "p[data-title]", priority: 60, getAttrs: (node) => ({ level: Number(node.getAttribute("data-title")) }) },
    ];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes, { "data-title": node.attrs.level }), 0];
  },
}).configure({ levels: [1, 2, 3] });

const EXTENSIONS = (placeholder: string) => [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: false,
    strike: false,
  }),
  Title,
  Placeholder.configure({ placeholder }),
  // A single newline is a line break, as in the read view (remark-breaks).
  Markdown.configure({ markedOptions: { breaks: true, gfm: true } }),
];

/** The part of Tiptap's MarkdownManager that loads HTML found in Markdown. */
type HtmlLoader = {
  parseHTMLToken: (token: { raw?: string; text?: string; block?: boolean }) => unknown;
  htmlAsLiteralText: (html: string, isBlock: boolean) => unknown;
};

/**
 * Loads HTML in notes (other than the `<u>` underline is stored as, which has its own tokenizer) as
 * the text it is, as the read view shows it: "Vec<T>" isn't dropped and "<b>" isn't bold.
 */
function loadHtmlAsText(editor: Editor) {
  const manager = editor.markdown as unknown as HtmlLoader;
  manager.parseHTMLToken = (token) => manager.htmlAsLiteralText(token.text || token.raw || "", Boolean(token.block));
}

/** The editor's Markdown, as notes are stored (markdown.ts), without the empty lines it ends with. */
function markdownOf(editor: Editor): string {
  return readableMarkdown(editor.getMarkdown()).replace(/\n+$/, "");
}

/**
 * A field that formats as it's written and holds Markdown (BIG-214): a toolbar for titles, bold,
 * italics, underline and lists (one tab stop; arrow keys move along it), Cmd/Ctrl+B, I and U, and
 * "# ", "- " or "1. " at the start of a line. It reports what's written as Markdown on every
 * change, and a `value` changed from outside replaces what's in it.
 */
export function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "",
  labelledBy,
  errorId,
  error,
  focusOnOpen = false,
  className,
}: {
  id: string;
  /** The Markdown to show. */
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  /** The id of the element naming the field: a contenteditable can't take a `<label for>`. */
  labelledBy: string;
  /** The id of the field's FieldError, which names it while there is an `error`. */
  errorId: string;
  error?: string;
  /** Takes focus, at the end, when it first shows: only when opening it was the request to write. */
  focusOnOpen?: boolean;
  className?: string;
}) {
  // What the editor has reported since it last loaded a value, oldest first. A value coming back
  // from it, even one a keystroke or two behind what's typed now, is never loaded over the typing.
  const reportedRef = useRef<string[]>([]);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    onBlurRef.current = onBlur;
  });

  // The field's attributes, read by the editor each time it updates.
  const attributes = editorAttributes({ id, labelledBy, errorId, error });
  const attributesRef = useRef(attributes);
  // Kept the same across renders: useEditor resets the editor's options whenever they change, which
  // would interrupt typing.
  const [extensions] = useState(() => EXTENSIONS(placeholder));
  const [editorProps] = useState(() => ({ attributes: () => attributesRef.current }));
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    editorProps,
    // Loaded once HTML loads as text, so the first value is read as every later one is. Created
    // just after it mounts, so focus arrives a moment after the field shows.
    onCreate: ({ editor: created }) => {
      loadHtmlAsText(created);
      created.commands.setContent(valueRef.current, { contentType: "markdown", emitUpdate: false });
      if (focusOnOpen) created.commands.focus("end");
    },
    onUpdate: ({ editor: changed }) => {
      const markdown = markdownOf(changed);
      reportedRef.current.push(markdown);
      onChangeRef.current(markdown);
    },
    onBlur: () => onBlurRef.current?.(),
  });

  // The field's ARIA follows its props: an empty transaction has the editor read them again.
  const attributesKey = JSON.stringify(attributes);
  useEffect(() => {
    attributesRef.current = JSON.parse(attributesKey) as Record<string, string>;
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false));
  }, [editor, attributesKey]);

  // A value set from outside (a save from elsewhere) replaces what's shown.
  useEffect(() => {
    if (!editor?.isInitialized) return;
    const echo = reportedRef.current.lastIndexOf(value);
    if (echo >= 0) {
      reportedRef.current.splice(0, echo);
      return;
    }
    if (value === markdownOf(editor)) return;
    reportedRef.current = [];
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value]);

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FormatToolbar editor={editor} controls={id} />
      <EditorContent editor={editor} />
    </div>
  );
}

/** The editable field's attributes: a multi-line textbox, named by its label, tied to its error. */
function editorAttributes({
  id,
  labelledBy,
  errorId,
  error,
}: {
  id: string;
  labelledBy: string;
  errorId: string;
  error: string | undefined;
}): Record<string, string> {
  const invalid = Object.entries(invalidProps(errorId, error)).map(([name, value]) => [name, String(value)]);
  return {
    id,
    role: "textbox",
    "aria-multiline": "true",
    "aria-labelledby": labelledBy,
    ...Object.fromEntries(invalid),
    class: cn(inputClasses, "rich-text max-h-96 min-h-24 overflow-y-auto text-base leading-[1.6]"),
  };
}

/** The formatting buttons in their groups, each pressed while what's selected has its format. */
function FormatToolbar({ editor, controls }: { editor: Editor | null; controls: string }) {
  const pressed = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      Object.fromEntries(FORMATS.map((format) => [format.name, current ? format.active(current) : false])),
  });
  return (
    <Toolbar.Root aria-label="Formatting" aria-controls={controls} className="flex flex-wrap gap-2">
      {GROUPS.map((group) => (
        <span key={group[0].name} className="inline-flex rounded-control shadow-xs">
          {group.map((format) => (
            <FormatButton key={format.name} format={format} editor={editor} on={pressed?.[format.name] ?? false} />
          ))}
        </span>
      ))}
    </Toolbar.Root>
  );
}

/** One formatting button, in a strip with the rest of its group (button-group.md). */
function FormatButton({ format, editor, on }: { format: Format; editor: Editor | null; on: boolean }) {
  return (
    <Toolbar.Button
      type="button"
      aria-label={format.label}
      aria-pressed={on}
      aria-keyshortcuts={format.key && `Control+${format.key} Meta+${format.key}`}
      title={format.key ? `${format.label} (Ctrl or ⌘ ${format.key})` : format.label}
      disabled={!editor}
      // Keeps the selection in the field while the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => editor && format.run(editor)}
      className={cn(
        "relative -ml-px inline-flex size-11 cursor-pointer items-center justify-center border border-line-medium bg-surface-white text-heading transition-colors first:ml-0 first:rounded-s-control last:rounded-e-control",
        "hover:z-10 hover:border-line-brand-subtle hover:bg-brand-softer",
        "focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "aria-pressed:z-10 aria-pressed:border-line-brand aria-pressed:bg-brand-soft aria-pressed:text-fg-brand-strong",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <format.icon className="size-4" aria-hidden />
    </Toolbar.Button>
  );
}
