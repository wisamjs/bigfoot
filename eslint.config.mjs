import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintReact from "@eslint-react/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";
import unicorn from "eslint-plugin-unicorn";

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
  // Turns off the eslint-plugin-react and react-hooks rules (from eslint-config-next) that
  // ESLint React also reports, such as set-state-in-effect, static-components and purity, so no
  // problem is reported twice.
  { ...eslintReact.configs["disable-conflict-eslint-plugin-react"], files: typeScriptFiles },
  { ...eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"], files: typeScriptFiles },
  // Except the two classic hooks rules: react-hooks keeps them, and ESLint React's copies go.
  {
    files: typeScriptFiles,
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@eslint-react/rules-of-hooks": "off",
      "@eslint-react/exhaustive-deps": "off",
      // static-components reports the same nested component.
      "@eslint-react/no-nested-component-definitions": "off",
    },
  },

  // Performance: the vercel-react-best-practices rules a linter can check (CODING_STANDARDS.md,
  // "Performance rules"). The rest of that skill is checked in review.
  {
    files: typeScriptFiles,
    plugins: { unicorn },
    rules: {
      // rerender-memo-with-default-value, and a context value rebuilt on every render.
      "@eslint-react/no-unstable-default-props": "error",
      "@eslint-react/no-unstable-context-value": "error",
      // async-parallel: independent awaits in a loop run one after another.
      "no-await-in-loop": "error",
      // bundle-barrel-imports: no `export *` barrels for modules to import through.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportAllDeclaration",
          message: "No barrel files: export each name from its own module, and import it from there.",
        },
      ],
      // js-tosorted-immutable: .sort() mutates, so it can change props or state in place.
      "unicorn/no-array-sort": "error",
      // js-set-map-lookups: Set#has over Array#includes for a fixed list checked repeatedly.
      "unicorn/prefer-set-has": "error",
      // js-flatmap-filter and js-combine-iterations: one pass instead of .map().flat().
      "unicorn/prefer-array-flat-map": "error",
      // js-early-exit: stop at the first match instead of filtering the whole array.
      "unicorn/prefer-array-find": "error",
      "unicorn/prefer-array-some": "error",
      // RegExp#test over String#match when only a yes or no is needed.
      "unicorn/prefer-regexp-test": "error",
    },
  },

  // ARIA: jsx-a11y's strict config. eslint-config-next registers the plugin, so only the rules
  // are added here.
  { files: ["**/*.{jsx,tsx}"], rules: asErrors(jsxA11y.flatConfigs.strict).rules },
  // Semantic HTML: every live jsx-a11y rule that strict leaves off. The rest it leaves off
  // (accessible-emoji, label-has-for, no-onchange) are deprecated.
  {
    files: ["**/*.{jsx,tsx}"],
    rules: {
      "jsx-a11y/prefer-tag-over-role": "error",
      "jsx-a11y/no-aria-hidden-on-focusable": "error",
      "jsx-a11y/anchor-ambiguous-text": "error",
      "jsx-a11y/lang": "error",
      // strict's own options, plus td: a table cell is not a control, and any control inside one
      // is checked on its own.
      "jsx-a11y/control-has-associated-label": [
        "error",
        {
          ...jsxA11y.flatConfigs.strict.rules["jsx-a11y/control-has-associated-label"][1],
          ignoreElements: [
            ...jsxA11y.flatConfigs.strict.rules["jsx-a11y/control-has-associated-label"][1].ignoreElements,
            "td",
          ],
        },
      ],
    },
  },

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
