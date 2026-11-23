import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintReact from "@eslint-react/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import testingLibrary from "eslint-plugin-testing-library";
import jestDom from "eslint-plugin-jest-dom";
import unicorn from "eslint-plugin-unicorn";
import boundaries from "eslint-plugin-boundaries";

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

  // Complexity: no function with more than 10 independent paths through it (CODING_STANDARDS.md,
  // "Lint rule groups"). Every linted file, tests and scripts included; Ruff's C901 does the same for Python.
  { rules: { complexity: ["error", 10] } },

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

  // Architecture: who may import whom (CODING_STANDARDS.md, "Where code goes"). Anything not
  // allowed below is an error, so a new link between features is a decision made here. Every
  // file in src belongs to an element (no-unknown-files), so a new folder can't slip past.
  {
    files: typeScriptFiles,
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "ui", pattern: "src/components/ui", partialMatch: false },
        { type: "hooks", pattern: "src/hooks", partialMatch: false },
        { type: "feature", pattern: "src/features/*", capture: ["feature"], partialMatch: false },
        { type: "lib", pattern: "src/lib", partialMatch: false },
        { type: "app", pattern: "src/app", partialMatch: false },
        { type: "test", pattern: "src/test", partialMatch: false },
      ],
      "boundaries/files": [
        // Next.js's root files: auth.ts, proxy.ts, instrumentation.ts and their tests.
        { category: "server", pattern: "src/*.ts" },
        { category: "test", pattern: "src/**/*.test.{ts,tsx}" },
        { category: "action", pattern: "src/app/**/actions.ts" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          // An import of a local file outside every element is reported too, not skipped.
          checkUnknownLocals: true,
          policies: [
            // The design system: anything that would make sense in a different app.
            { from: { element: { type: "ui" } }, allow: { to: { element: { types: { anyOf: ["ui", "hooks"] } } } } },
            { from: { element: { type: "hooks" } }, allow: { to: { element: { type: "hooks" } } } },
            // Domain and server code, used by routes and components alike; lib/dal.ts reads the
            // session from auth.ts.
            { from: { element: { type: "lib" } }, allow: [{ to: { element: { type: "lib" } } }, { to: { file: { categories: "server" } } }] },
            { from: { file: { categories: "server" } }, allow: [{ to: { element: { type: "lib" } } }, { to: { file: { categories: "server" } } }] },
            // A feature builds on the design system, the domain, and the server actions it calls.
            {
              from: { element: { type: "feature" } },
              allow: [
                { to: { element: { types: { anyOf: ["ui", "hooks", "lib"] } } } },
                { to: { file: { categories: "action" } } },
              ],
            },
            // The only links between features.
            ...Object.entries({
              dashboard: ["applications", "shell"],
              landing: ["applications", "auth", "shell"],
              shell: ["auth"],
            }).map(([from, to]) => ({
              from: { element: { type: "feature", captured: { feature: from } } },
              allow: { to: { element: { type: "feature", captured: { feature: to } } } },
            })),
            // Routes put it all together.
            {
              from: { element: { type: "app" } },
              allow: [
                { to: { element: { types: { anyOf: ["ui", "hooks", "feature", "lib", "app"] } } } },
                { to: { file: { categories: "server" } } },
              ],
            },
            // Tests and their shared fixtures may reach anything.
            ...[{ file: { categories: "test" } }, { element: { type: "test" } }].map((from) => ({
              from,
              allow: [
                { to: { element: { types: { anyOf: ["ui", "hooks", "feature", "lib", "app", "test"] } } } },
                { to: { file: { categories: "server" } } },
              ],
            })),
          ],
        },
      ],
      "boundaries/no-unknown-files": "error",
    },
  },

  // Script injection: nothing a job seeker types may run as code (BIG-89). ESLint React's preset
  // above already bans dangerouslySetInnerHTML and javascript: URLs in JSX; these close the
  // other ways to turn a string into code.
  {
    files: typeScriptFiles,
    rules: {
      "no-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "@typescript-eslint/no-implied-eval": "error",
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
    // npm run build-storybook's output.
    "storybook-static/**",
    // Claude Code worktrees: other branches' checkouts, linted in their own sessions.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
