import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launchChrome, openPage, seenText, skipLinkProblems } from "./chrome.mjs";

describe("seenText", () => {
  it("quotes the page's text on one line", () => {
    expect(seenText("Application error\n\n  Digest: 123 ")).toBe('"Application error Digest: 123"');
  });

  it("cuts long text short", () => {
    expect(seenText("a".repeat(400))).toBe(`"${"a".repeat(300)}…"`);
  });

  it("says when the page showed nothing", () => {
    expect(seenText(" \n")).toBe("nothing");
    expect(seenText(undefined)).toBe("nothing");
  });
});

/**
 * A page with a skip link, a header link before <main> and a footer link after it. `main` is its
 * content; `hydrate` marks <main> as hydrated by React, as settled() looks for, after `delayMs`.
 */
function page({ before = "", main, delayMs = 0, later = "" }: { before?: string; main: string; delayMs?: number; later?: string }) {
  const html = `<!doctype html><title>t</title><body>
    <a href="#main">Skip to content</a>${before}<header><a href="/home">Home</a></header>
    <main id="main">${main}</main>
    <footer><a href="/privacy">Privacy Policy</a></footer>
    <script>
      setTimeout(() => {
        const main = document.querySelector("main");
        main.insertAdjacentHTML("beforeend", ${JSON.stringify(later)});
        main.__reactProps$test = {};
      }, ${delayMs});
    </script>`;
  return html;
}

describe("skipLinkProblems", () => {
  let chrome: Awaited<ReturnType<typeof launchChrome>>;
  beforeAll(async () => {
    chrome = await launchChrome();
    await chrome.send("Page.enable");
  }, 30_000);
  afterAll(() => chrome?.close());

  // On about:blank, not a data: URL, where Chrome blocks the skip link's jump as a navigation.
  async function check(html: string) {
    await openPage(chrome, "about:blank", "");
    const { frameTree } = await chrome.send("Page.getFrameTree");
    await chrome.send("Page.setDocumentContent", { frameId: frameTree.frame.id, html });
    return skipLinkProblems(chrome);
  }

  it("passes a skip link that leads into <main>", async () => {
    expect(await check(page({ main: "<button>Open</button>" }))).toEqual([]);
  });

  it("waits for content that replaces a skeleton after load", async () => {
    expect(await check(page({ main: "<p>Loading…</p>", delayMs: 1000, later: "<button>Open</button>" }))).toEqual([]);
  });

  it("fails a skip link whose target isn't the <main>", async () => {
    // An earlier element holds id="main", so the link jumps there and Tab reaches the header first.
    expect(await check(page({ before: '<div id="main"></div>', main: "<button>Open</button>" }))).toEqual([
      'after the skip link, Tab doesn\'t continue inside <main>; it lands on <a> "Home"',
    ]);
  });

  // BIG-215: the Journey sends a skeleton with nothing to focus and swaps in its controls once the
  // browser knows the Viewer's time zone. The check judged whatever <main> held at that moment, so a
  // slow machine could judge the skeleton and a fast one the controls. Judged before the content
  // arrives, this page would pass.
  it("fails a skip link whose target isn't the <main>, once late content arrives", async () => {
    expect(
      await check(page({ before: '<div id="main"></div>', main: "<p>Loading…</p>", delayMs: 1000, later: "<button>Open</button>" })),
    ).toEqual(['after the skip link, Tab doesn\'t continue inside <main>; it lands on <a> "Home"']);
  });
});
