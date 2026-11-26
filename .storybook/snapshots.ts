// Pictures each Pages story, dark and light, once its test passes, for docs/snapshots/
// (scripts/snapshot-store.mjs). Only when scripts/snapshots.mjs runs the story tests: it sets
// SNAPSHOTS_LOG, which vitest.config.mts passes on as `snapshots`. The page is pictured whole, at
// the width its story sets (DESKTOP or MOBILE in src/test/pages.ts), after its play function.
import { afterEach, inject } from "vitest";
import { commands, page } from "vitest/browser";
import { applyTheme, type Theme } from "./theme";

declare module "vitest" {
  interface ProvidedContext {
    snapshots: boolean;
  }
}

declare module "vitest/browser" {
  interface BrowserCommands {
    /** Saves a base64 PNG for the story, unless the saved one shows the same picture. */
    saveSnapshot: (storyId: string, theme: Theme, base64: string, width: number) => Promise<void>;
    /** Sizes the window around the test frame, which Vitest otherwise shrinks to fit 1280×720. */
    sizeHost: (width: number, height: number) => Promise<{ width: number; height: number }>;
  }
}

type StoryContext = { story?: { id: string } };

const nextFrame = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));

afterEach(async (context) => {
  const story = (context as typeof context & StoryContext).story;
  if (!inject("snapshots") || !story?.id.startsWith("pages-") || context.task.result?.state === "fail") return;
  await document.fonts.ready;
  const { innerWidth: width, innerHeight: height } = window;
  // The whole page, not only the first screen: the frame grows to the page's height, and the window
  // around it grows too, or Vitest scales the frame down and the picture with it.
  const full = Math.max(height, document.documentElement.scrollHeight);
  const host = await commands.sizeHost(width, full);
  await page.viewport(width, full);
  try {
    for (const theme of ["dark", "light"] as const) {
      applyTheme(theme);
      await nextFrame();
      const base64 = await page.screenshot({ element: document.documentElement, save: false });
      await commands.saveSnapshot(story.id, theme, base64, width);
    }
  } finally {
    applyTheme("dark");
    await page.viewport(width, height);
    await commands.sizeHost(host.width, host.height);
  }
});
