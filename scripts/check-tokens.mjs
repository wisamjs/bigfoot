#!/usr/bin/env node
// Candy design tokens: components use token utilities, never raw colours or ad-hoc radii.
// Token values live in src/app/globals.css (the only file allowed to hold them).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/components", "src/features", "src/hooks", "src/app"];
const EXTENSIONS = /\.(tsx|ts|jsx|js)$/;

// Shadow utilities Bigfoot defines (`--shadow-<name>` in globals.css's @theme). Tailwind's other
// built-in sizes (shadow-sm, shadow-xl…) would compile with Tailwind's grey, not the brand tint.
const SHADOWS = [...readFileSync("src/app/globals.css", "utf8").matchAll(/^\s*--shadow-([\w-]+):\s*var\(/gm)].map((m) => m[1]);

const RULES = [
  { pattern: /#[0-9a-fA-F]{3,8}\b/, fix: "use a colour token (e.g. text-heading, bg-card)" },
  { pattern: /\brgba?\(/, fix: "use a colour token or a CSS variable from globals.css" },
  { pattern: /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via)-\[(?:#|rgb|hsl)/, fix: "use a colour token" },
  { pattern: /\brounded(?:-[trblse]{1,2})?-\[/, fix: "use rounded-card (24px), rounded-control (8px) or rounded-full" },
  {
    pattern: new RegExp(`(?<![\\w-])shadow-(?!(?:${[...SHADOWS, "none"].join("|")})(?![\\w-]))[\\w[]+`),
    fix: `use a shadow token: ${SHADOWS.map((s) => `shadow-${s}`).join(", ")}`,
  },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (EXTENSIONS.test(name)) yield path;
  }
}

let violations = 0;
for (const root of ROOTS) {
  for (const file of files(root)) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        for (const rule of RULES) {
          const match = line.match(rule.pattern);
          if (match) {
            console.error(`${relative(".", file)}:${i + 1}  "${match[0]}"  ${rule.fix}`);
            violations++;
          }
        }
      });
  }
}

if (violations) {
  console.error(`\n${violations} design-token violation(s). Spec: .claude/skills/typeui-design-system/`);
  process.exit(1);
}
console.log("Design tokens: OK");
