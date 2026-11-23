import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Unit tests (*.test.ts) run in Node; component tests (*.test.tsx) in happy-dom, whose focus
// model is too thin to prove a dialog's focus trap or where focus returns, so `npm run a11y`
// checks those in Chrome.
// Async Server Components aren't supported by Vitest: smoke and a11y cover those pages.
// The storybook project renders every story in Chrome and fails on its play function or an axe
// violation (.storybook/preview.tsx). `npm run test-storybook` runs it; `npm test` runs the others.

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
          browser: {
            enabled: true,
            headless: true,
            // The installed Google Chrome (preinstalled on CI's runners), so nothing is downloaded.
            provider: playwright({ launchOptions: { channel: "chrome" } }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.stories.tsx", "src/test/**"],
      reporter: ["text-summary", "html"],
      // Current coverage minus 2 points. Raise these as tests are added; never lower them.
      thresholds: { statements: 56, branches: 56, functions: 57, lines: 56 },
    },
  },
});
