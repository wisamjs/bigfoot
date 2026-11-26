#!/usr/bin/env node
// Candy design tokens (the colour tokens in .claude/skills/typeui-design-system/). Two checks:
// - Components use token utilities, never raw colours or ad-hoc radii.
// - src/app/globals.css keeps its two tiers: hex values only in the base block, no base step
//   repeated, and no token that nothing uses.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CSS_PATH = "src/app/globals.css";
const ROOTS = ["src/components", "src/features", "src/hooks", "src/app"];
const EXTENSIONS = /\.(tsx|ts|jsx|js)$/;
const RAW_COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/g;

/** Tailwind utilities that take a colour, so `bg-card` or `hover:border-line/50` uses `--card` or `--line`. */
const COLOUR_UTILITIES = "bg|text|border(?:-[a-z])?|ring|outline|fill|stroke|from|to|via|divide|decoration|caret|accent|placeholder";

/** The body of the block that follows `/* @tokens <name> *\/` in globals.css, comments removed. */
export function tokenBlock(css, name) {
  const start = css.indexOf(`/* @tokens ${name} */`);
  if (start < 0) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < css.length; end++) {
    if (css[end] === "{") depth++;
    if (css[end] === "}" && --depth === 0) break;
  }
  return stripComments(css.slice(open + 1, end));
}

/** The `--name: value;` declarations in a block body (nested blocks included). */
export function declarations(body) {
  return [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => ({ name: m[1], value: m[2].trim() }));
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Raw colours outside the base block: a role must point at a base step instead. */
function rawColoursOutsideBase(css) {
  const base = tokenBlock(css, "base");
  const rest = stripComments(css).replace(base, "");
  return [...new Set(rest.match(RAW_COLOUR) ?? [])].map(
    (value) => `${CSS_PATH}: "${value}" outside the base block; point the token at a base step (var(--pink-800))`,
  );
}

/** Base steps sharing a value: one colour, one name. */
function repeatedBaseSteps(css) {
  const seen = new Map();
  return declarations(tokenBlock(css, "base")).flatMap(({ name, value }) => {
    const key = value.toLowerCase();
    const first = seen.get(key);
    seen.set(key, first ?? name);
    return first ? [`${CSS_PATH}: --${name} repeats --${first} (${value}); keep one base step per colour`] : [];
  });
}

/** How each token is reached as a Tailwind utility, from @theme inline: `--color-card: var(--card)` → bg-card… */
function utilityPatterns(css) {
  const patterns = new Map();
  for (const { name, value } of declarations(tokenBlock(css, "theme"))) {
    const token = /^var\(--([\w-]+)\)$/.exec(value)?.[1];
    if (!token) continue;
    const utility = name.startsWith("color-")
      ? `(?:${COLOUR_UTILITIES})-${name.slice("color-".length)}`
      : name; // shadow-xs, radius-… are utilities by their own name
    patterns.set(token, new RegExp(`(?<![\\w-])${utility}(?:/\\d+)?(?![\\w-])`));
  }
  return patterns;
}

/** Base and role tokens that no stylesheet, component or story uses. shadcn's theme variables are exempt. */
function unusedTokens(css, sources) {
  const defined = [...declarations(tokenBlock(css, "base")), ...declarations(tokenBlock(css, "roles"))].map((d) => d.name);
  const theme = tokenBlock(css, "theme");
  // Uses in globals.css: var(--x) anywhere but the @theme mapping, whose only job is to expose it.
  const cssUses = stripComments(css).replace(theme, "");
  const utilities = utilityPatterns(css);
  const code = sources.join("\n");
  return defined
    .filter((name) => {
      const asVar = `var(--${name})`;
      if (cssUses.includes(asVar) || code.includes(asVar)) return false;
      return !utilities.get(name)?.test(code);
    })
    .map((name) => `${CSS_PATH}: --${name} is unused; delete it, or use a role or base step that exists`);
}

/**
 * What's wrong with globals.css's colour tiers, one line each.
 * @param {{ css: string, sources: string[] }} input globals.css, and the text of every file that may use a token.
 */
export function paletteProblems({ css, sources }) {
  return [...rawColoursOutsideBase(css), ...repeatedBaseSteps(css), ...unusedTokens(css, sources)];
}

// Shadow utilities Bigfoot defines (`--shadow-<name>` in globals.css's @theme). Tailwind's other
// built-in sizes (shadow-sm, shadow-xl…) would compile with Tailwind's grey, not the brand tint.
function componentRules(css) {
  const shadows = [...css.matchAll(/^\s*--shadow-([\w-]+):\s*var\(/gm)].map((m) => m[1]);
  return [
    { pattern: /#[0-9a-fA-F]{3,8}\b/, fix: "use a colour token (e.g. text-heading, bg-card)" },
    { pattern: /\brgba?\(/, fix: "use a colour token or a CSS variable from globals.css" },
    { pattern: /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via)-\[(?:#|rgb|hsl)/, fix: "use a colour token" },
    { pattern: /\brounded(?:-[trblse]{1,2})?-\[/, fix: "use rounded-card (24px), rounded-control (8px) or rounded-full" },
    {
      pattern: new RegExp(`(?<![\\w-])shadow-(?!(?:${[...shadows, "none"].join("|")})(?![\\w-]))[\\w[]+`),
      fix: `use a shadow token: ${shadows.map((s) => `shadow-${s}`).join(", ")}`,
    },
  ];
}

/** Raw colours, ad-hoc radii and grey shadows in component code. */
export function componentProblems(css, files) {
  const rules = componentRules(css);
  return files.flatMap(({ path, text }) =>
    text.split("\n").flatMap((line, i) =>
      rules.flatMap(({ pattern, fix }) => {
        const match = line.match(pattern);
        return match ? [`${path}:${i + 1}  "${match[0]}"  ${fix}`] : [];
      }),
    ),
  );
}

function* walk(dir, extensions) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path, extensions);
    else if (extensions.test(name)) yield path;
  }
}

function read(paths) {
  return paths.map((path) => ({ path: relative(".", path), text: readFileSync(path, "utf8") }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const css = readFileSync(CSS_PATH, "utf8");
  const components = read(ROOTS.flatMap((root) => [...walk(root, EXTENSIONS)]));
  const users = read(
    ["src", ".storybook"].flatMap((root) => [...walk(root, /\.(tsx|ts|mdx|css)$/)]).filter((path) => !path.endsWith("globals.css")),
  );
  const problems = [...componentProblems(css, components), ...paletteProblems({ css, sources: users.map((file) => file.text) })];
  if (problems.length) {
    console.error(problems.join("\n"));
    console.error(`\n${problems.length} design-token problem(s). Spec: the colour tokens in .claude/skills/typeui-design-system/`);
    process.exit(1);
  }
  console.log("Design tokens: OK");
}
