import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit tests (*.test.ts) run in Node; component tests (*.test.tsx) in happy-dom, whose focus
// model is too thin to prove a dialog's focus trap or where focus returns, so `npm run a11y`
// checks those in Chrome.
// Async Server Components aren't supported by Vitest: smoke and a11y cover those pages.

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
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**"],
      reporter: ["text-summary", "html"],
      // Current coverage minus 2 points. Raise these as tests are added; never lower them.
      thresholds: { statements: 56, branches: 56, functions: 57, lines: 56 },
    },
  },
});
