import type { Html, Parent, PhrasingContent, Root, RootContent } from "mdast";

/**
 * The Markdown that notes are stored as (BIG-214): paragraphs, titles (`#` to `###`), **bold**,
 * *italics*, <u>underline</u>, bulleted and numbered lists, and a single newline as a line break.
 * The editor (`rich-text-editor.tsx`) writes it and the read view (`markdown-view.tsx`) shows it;
 * these are the rules they share.
 */

/** A list item's line, unindented: "- ", "* ", "+ " or "1. ". */
const LIST_LINE = /^(?:[-*+]|\d{1,9}[.)])\s/;
/** A line ending in a hard line break, as the editor writes one: two spaces or a backslash. */
const HARD_BREAK_END = / {2,}$|\\$/;

/**
 * Notes as Markdown reads them, keeping how plain-text notes written before BIG-214 read: a line
 * straight after a "- " list line was a paragraph of its own, where Markdown would carry it into the
 * list item. A list line the editor ended with a line break keeps the next line in its item.
 */
export function notesMarkdown(notes: string): string {
  const lines = notes.replace(/\r\n?/g, "\n").split("\n");
  return lines
    .map((line, index) => {
      const before = lines[index - 1];
      const after =
        before !== undefined &&
        LIST_LINE.test(before) &&
        !HARD_BREAK_END.test(before) &&
        line.trim() !== "" &&
        !/^\s/.test(line) &&
        !LIST_LINE.test(line);
      return after ? `\n${line}` : line;
    })
    .join("\n");
}

/**
 * The editor's Markdown made readable: Tiptap writes `&`, `<` and `>` in text as HTML entities, so
 * "Q&A" would be stored as "Q&amp;A". Back to the character, or backslash-escaped where Markdown
 * would read it as HTML or a quote. An entity typed as text ("&lt;") stays escaped.
 */
export function readableMarkdown(markdown: string): string {
  return markdown
    .replace(/&lt;/g, "\\<")
    .replace(/&gt;/g, "\\>")
    .replace(/&amp;(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/g, "&");
}

const OPEN_U = /^<u>$/i;
const CLOSE_U = /^<\/u>$/i;
/** Parents whose children are blocks, where HTML read as text needs a paragraph around it. */
const BLOCK_PARENTS = new Set(["root", "listItem", "blockquote"]);

/**
 * The read view's remark plugin: `<u>…</u>` becomes underline and every other piece of HTML is
 * shown as the text it is, so nothing typed in notes runs as markup (CODING_STANDARDS.md).
 */
export function remarkUnderlineOnly() {
  return (tree: Root) => {
    rewriteHtml(tree);
  };
}

function rewriteHtml(parent: Parent) {
  const children = parent.children as RootContent[];
  const out: RootContent[] = [];
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (child.type !== "html") {
      if ("children" in child) rewriteHtml(child);
      out.push(child);
      continue;
    }
    const close = OPEN_U.test(child.value) ? children.findIndex((c, i) => i > index && isHtml(c, CLOSE_U)) : -1;
    if (close > index) {
      const underline = {
        type: "underline",
        children: children.slice(index + 1, close),
        data: { hName: "u" },
      } as unknown as PhrasingContent;
      rewriteHtml(underline as unknown as Parent);
      out.push(underline);
      index = close;
      continue;
    }
    const text = { type: "text" as const, value: child.value };
    out.push(BLOCK_PARENTS.has(parent.type) ? { type: "paragraph", children: [text] } : text);
  }
  parent.children = out as Parent["children"];
}

function isHtml(node: RootContent, pattern: RegExp): node is Html {
  return node.type === "html" && pattern.test(node.value);
}
