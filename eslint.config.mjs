import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintReact from "@eslint-react/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";

// Rule groups and what each guards are listed in CODING_STANDARDS.md ("Lint rule groups").

/** A shared config with every rule it turns on raised to "error", so nothing stays a warning. */
function asErrors(config) {
  const rules = Object.fromEntries(
    Object.entries(config.rules ?? {}).map(([name, setting]) => {
      const [level, ...options] = Array.isArray(setting) ? setting : [setting];
      const off = level === "off" || level === 0;
      return [name, off ? setting : ["error", ...options]];
    }),
  );
  return { ...config, rules };
}

const typeScriptFiles = ["src/**/*.{ts,tsx}"];
const componentTestFiles = ["**/*.test.tsx"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // React: ESLint React's type-checked TypeScript preset.
  {
    ...asErrors(eslintReact.configs["recommended-type-checked"]),
    files: typeScriptFiles,
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  // Turns off eslint-plugin-react rules (from eslint-config-next) that ESLint React also
  // reports, so no problem is reported twice. react-hooks stays on.
  { ...eslintReact.configs["disable-conflict-eslint-plugin-react"], files: typeScriptFiles },
  {
    files: typeScriptFiles,
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },

  // ARIA: jsx-a11y's strict config. eslint-config-next registers the plugin, so only the rules
  // are added here.
  { files: ["**/*.{jsx,tsx}"], rules: asErrors(jsxA11y.flatConfigs.strict).rules },

  // Testing Library and jest-dom, in component tests only.
  { ...asErrors(testingLibrary.configs["flat/react"]), files: componentTestFiles },
  { ...asErrors(jestDom.configs["flat/recommended"]), files: componentTestFiles },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vitest's HTML coverage report.
    "coverage/**",
    // Claude Code worktrees: other branches' checkouts, linted in their own sessions.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
