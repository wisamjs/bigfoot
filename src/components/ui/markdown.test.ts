import { describe, expect, it } from "vitest";
import { notesMarkdown, readableMarkdown } from "./markdown";

describe("notesMarkdown", () => {
  it("ends a list before a line that follows it, as plain-text notes read before Markdown", () => {
    expect(notesMarkdown("- Send thank-you\n- Ask about on-call\nDone.")).toBe("- Send thank-you\n- Ask about on-call\n\nDone.");
    expect(notesMarkdown("1. One\nAfter")).toBe("1. One\n\nAfter");
  });

  it("keeps a line in its list item after the editor's line break, or when it's indented", () => {
    expect(notesMarkdown("- One  \nstill one")).toBe("- One  \nstill one");
    expect(notesMarkdown("- One\\\nstill one")).toBe("- One\\\nstill one");
    expect(notesMarkdown("- One\n  still one")).toBe("- One\n  still one");
  });

  it("leaves lists, blank lines and other text alone", () => {
    expect(notesMarkdown("- One\n- Two\n\nText\nMore")).toBe("- One\n- Two\n\nText\nMore");
    expect(notesMarkdown("-5 degrees\nWarm")).toBe("-5 degrees\nWarm");
    expect(notesMarkdown("")).toBe("");
  });

  it("reads Windows line endings as newlines", () => {
    expect(notesMarkdown("- One\r\nDone.")).toBe("- One\n\nDone.");
  });
});

describe("readableMarkdown", () => {
  it("writes &, < and > as characters, escaping the two Markdown would read as HTML or a quote", () => {
    expect(readableMarkdown("Q&amp;A on Vec&lt;T&gt;")).toBe("Q&A on Vec\\<T\\>");
  });

  it("keeps an entity typed as text escaped, so it reads back as typed", () => {
    expect(readableMarkdown("&amp;lt; &amp;#60; &amp;#x3C; &amp;nbsp;")).toBe("&amp;lt; &amp;#60; &amp;#x3C; &amp;nbsp;");
  });

  it("leaves the editor's own Markdown as it is", () => {
    expect(readableMarkdown("# Title\n\n**bold** <u>under</u>")).toBe("# Title\n\n**bold** <u>under</u>");
  });
});
