import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { INJECTED_ELEMENTS, XSS_TEXT } from "@/test/xss";
import { MarkdownView } from "./markdown-view";

function view(markdown: string, headingLevel?: 3 | 4) {
  render(<MarkdownView markdown={markdown} headingLevel={headingLevel} data-testid="notes" />);
  return screen.getByTestId("notes");
}

describe("MarkdownView", () => {
  it("shows titles, bold, italics, underline and both kinds of list", () => {
    const notes = view("# Big\n## Medium\n### Small\n\n**bold** *italic* <u>under</u>\n\n- one\n- two\n\n1. first\n2. second");
    expect(within(notes).getByRole("heading", { level: 3, name: "Big" })).toBeInTheDocument();
    // Every title is one level under the card, whatever its size, so the outline skips none.
    expect(within(notes).getByRole("heading", { level: 3, name: "Medium" })).toHaveClass("text-lg");
    expect(within(notes).getByRole("heading", { level: 3, name: "Small" })).toHaveClass("text-base");
    expect(within(notes).getByRole("heading", { level: 3, name: "Big" })).toHaveClass("text-xl");
    expect(within(notes).getByText("bold").tagName).toBe("STRONG");
    expect(within(notes).getByText("italic").tagName).toBe("EM");
    expect(within(notes).getByText("under").tagName).toBe("U");
    const [bullets, numbers] = within(notes).getAllByRole("list");
    expect(bullets.tagName).toBe("UL");
    expect(numbers.tagName).toBe("OL");
    expect(within(numbers).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["first", "second"]);
  });

  it("puts titles one level lower under an h3, the smallest sizes alike", () => {
    const notes = view("# Big\n\n###### Smallest", 4);
    expect(within(notes).getByRole("heading", { level: 4, name: "Big" })).toBeInTheDocument();
    expect(within(notes).getByRole("heading", { level: 4, name: "Smallest" })).toHaveClass("text-base");
  });

  it("reads plain-text notes as before: each line on its own, and a line after a list outside it", () => {
    const notes = view("Asked about caching.\nThen queues.\n- Send thank-you\nDone.");
    // A line break keeps the lines apart, in one paragraph.
    // eslint-disable-next-line testing-library/no-node-access -- a line break has no role or text.
    expect(notes.querySelectorAll("br")).toHaveLength(1);
    expect(within(notes).getByRole("listitem")).toHaveTextContent(/^Send thank-you$/);
    expect(within(notes).getByText("Done.").tagName).toBe("P");
  });

  it("underlines across other formats, and leaves a <u> with no end as text", () => {
    const notes = view("**<u>both</u>** and <u>open");
    expect(within(notes).getByText("both").tagName).toBe("U");
    expect(within(notes).getByText("both").parentElement?.tagName).toBe("STRONG");
    expect(notes).toHaveTextContent("and <u>open");
  });

  it.each(XSS_TEXT)("shows %j as text", (payload) => {
    const notes = view(payload);
    expect(notes).toHaveTextContent(payload, { normalizeWhitespace: false });
    // eslint-disable-next-line testing-library/no-node-access -- injected tags have no role or text to query by.
    expect(document.body.querySelectorAll(INJECTED_ELEMENTS)).toHaveLength(0);
  });

  it("shows links, images, code and quotes as their words, so nothing typed goes anywhere", () => {
    const notes = view("[click](javascript:alert(1)) ![pic](x.png) `code` <u onclick=\"x\">u</u>\n\n> quoted");
    expect(within(notes).queryByRole("link")).not.toBeInTheDocument();
    expect(within(notes).queryByRole("img")).not.toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access -- checking no element was made.
    expect(notes.querySelectorAll("code, blockquote, [onclick]")).toHaveLength(0);
    expect(notes).toHaveTextContent('click code <u onclick="x">u</u> quoted');
  });
});
