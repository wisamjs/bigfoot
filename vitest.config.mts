import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
import type { BrowserCommand } from "vitest/node";
import { saveSnapshot as store, snapshotPath } from "./scripts/snapshot-store.mjs";

// Unit tests (*.test.ts) run in Node; component tests (*.test.tsx) in happy-dom, whose focus
// model is too thin to prove a dialog's focus trap or where focus returns, so `npm run a11y`
// checks those in Chrome.
// Async Server Components aren't supported by Vitest: smoke and a11y cover those pages.
// The storybook project renders every story in Chrome and fails on its play function or an axe
// violation (.storybook/preview.tsx). `npm run test-storybook` runs it; `npm test` runs the others.
// Under scripts/snapshots.mjs (SNAPSHOTS_LOG set) it also pictures each Pages story for
// docs/snapshots/: .storybook/snapshots.ts takes the picture, saveSnapshot stores it.

const saveSnapshot: BrowserCommand<[storyId: string, theme: "dark" | "light", base64: string, width: number]> = async (
  _context,
  storyId,
  theme,
  base64,
  width,
) => {
  const path = snapshotPath(storyId, theme);
  if (!path) throw new Error(`Not a Pages story: ${storyId}`);
  await store(path, Buffer.from(base64, "base64"), { log: process.env.SNAPSHOTS_LOG, width });
};

/** Sets the size of the window around the test frame, at least `width`×`height`; returns the old size. */
const sizeHost: BrowserCommand<[width: number, height: number]> = async (context, width, height) => {
  if (context.provider.name !== "playwright") throw new Error("sizeHost needs the Playwright provider");
  const { page } = context as typeof context & { page: import("playwright").Page };
  const old = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.setViewportSize({ width, height });
  return old;
};

const DETERMINISTIC_RENDERING = [
  "--disable-gpu",
  "--force-color-profile=srgb",
  "--font-render-hinting=none",
  "--disable-lcd-text",
  "--disable-skia-runtime-opts",
  "--disable-partial-raster",
];

const resolve = { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } };

export default defineConfig({
  test: {
    projects: [
      {
        resolve,
        test: { name: "unit", environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
      },
      {
        plugins: [react()],
        resolve,
        test: {
          name: "components",
          environment: "happy-dom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        plugins: [storybookTest({ configDir: fileURLToPath(new URL("./.storybook", import.meta.url)) })],
        test: {
          name: "storybook",
          setupFiles: ["./.storybook/snapshots.ts"],
          provide: { snapshots: Boolean(process.env.SNAPSHOTS_LOG) },
          browser: {
            commands: { saveSnapshot, sizeHost },
            enabled: true,
            headless: true,
            // The installed Google Chrome (preinstalled on CI's runners), so nothing is downloaded.
            // Reduced motion: globals.css then skips animations and transitions, so a dialog or
            // popover is visible on its first render and play functions need no waitFor for it.
            // The args make Chrome draw the same pixels every run (without them text antialiasing
            // shifts by a shade from run to run), so docs/snapshots/ changes only when a page does.
            provider: playwright({
              launchOptions: { channel: "chrome", args: DETERMINISTIC_RENDERING },
              contextOptions: { reducedMotion: "reduce" },
            }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // mock-data.ts is test data, not logic to test.
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.stories.tsx", "src/test/**", "src/lib/mock-data.ts"],
      reporter: ["text-summary", "html"],
      // Current coverage minus 2 points, rounded down. Raise these as tests are added; never lower
      // them. The global floor counts every file, src/lib's too; src/lib, the domain and data
      // access, also has its own, higher floor (CODING_STANDARDS.md, "Coverage floors").
      thresholds: {
        statements: 84,
        branches: 84,
        functions: 80,
        lines: 85,
        "src/lib/**": { statements: 97, branches: 97, functions: 98, lines: 97 },
      },
    },
  },
});
