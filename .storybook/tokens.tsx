/// <reference types="vite/client" />
import { useState } from "react";
import css from "../src/app/globals.css?raw";

// The token page's tables (tokens.mdx), read from globals.css itself, so a token added there shows
// up here without editing this file. Swatches paint with var(--token), so they follow dark mode.

type Declaration = { name: string; value: string };

/** The `--name: value;` declarations in the block globals.css marks `@tokens <marker>` (scripts/check-tokens.mjs). */
function declarationsIn(marker: string): Declaration[] {
  const start = css.indexOf(`/* @tokens ${marker} */`);
  if (start < 0) return [];
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < css.length; end++) {
    if (css[end] === "{") depth++;
    if (css[end] === "}" && --depth === 0) break;
  }
  const body = css.slice(open + 1, end).replace(/\/\*[\s\S]*?\*\//g, "");
  return [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => ({ name: m[1], value: m[2].trim() }));
}

const base = declarationsIn("base");
const roles = declarationsIn("roles");
const dark = new Map(declarationsIn("dark").map((d) => [d.name, d.value]));
const theme = declarationsIn("theme");

/** Base steps grouped by scale: mauve, pink, white, green… in the order globals.css lists them. */
export const scales = [
  ...base.reduce((groups, d) => {
    const scale = d.name.replace(/-\d+$/, "");
    groups.set(scale, [...(groups.get(scale) ?? []), d]);
    return groups;
  }, new Map<string, Declaration[]>()),
];
export const colourRoles = roles.filter((d) => d.value.startsWith("var(--"));
export const radii = theme.filter((d) => d.name.startsWith("radius-"));
export const shadows = roles.filter((d) => d.name.startsWith("shadow-"));
export const fontSans = theme.find((d) => d.name === "font-sans")?.value ?? "";
const bodyRule = /\bbody\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
const bodyValue = (property: string) => new RegExp(`${property}:\\s*([^;]+);`).exec(bodyRule)?.[1].trim() ?? "";
/** `var(--pink-800)` → `pink-800`. */
const step = (value: string) => /^var\(--([\w-]+)\)$/.exec(value)?.[1] ?? value;

const cell = "border-b border-line px-3 py-2 text-left align-middle text-sm";
const code = "font-mono text-xs text-heading";

/** Every base scale as a row of swatches, lightest first. These are the app's only hex values. */
export function BaseScales() {
  return (
    <div className="flex flex-col gap-4">
      {scales.map(([scale, steps]) => (
        <div key={scale} className="flex flex-col gap-1">
          <span className={code}>{scale}</span>
          <div className="flex flex-wrap gap-2">
            {steps.map(({ name, value }) => (
              <div key={name} className="flex w-20 flex-col gap-1">
                <span aria-hidden className="block h-10 rounded-control border border-line" style={{ background: value }} />
                <span className="text-xs text-heading">{name.slice(scale.length + 1) || scale}</span>
                <span className="font-mono text-xs">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Each role and the base step it points at, light and dark. Swatches follow the toolbar's Theme. */
export function RoleTable() {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={cell}>Swatch</th>
          <th className={cell}>Role</th>
          <th className={cell}>Light</th>
          <th className={cell}>Dark</th>
        </tr>
      </thead>
      <tbody>
        {colourRoles.map(({ name, value }) => (
          <tr key={name}>
            <td className={cell}>
              <span aria-hidden className="block size-8 rounded-control border border-line" style={{ background: `var(--${name})` }} />
            </td>
            <td className={`${cell} ${code}`}>--{name}</td>
            <td className={`${cell} ${code}`}>{step(value)}</td>
            <td className={`${cell} ${code}`}>{dark.has(name) ? step(dark.get(name) ?? "") : "same"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const WEIGHTS = [400, 500, 700];
const SIZES = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-[30px]", "text-[44px]"];

export function Typography() {
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-sm">
        <span className={code}>--font-sans</span>: {fontSans}. Body text: {bodyValue("font-size")}, line height{" "}
        {bodyValue("line-height")}, Allo’s roundness axis {bodyValue("font-variation-settings")}.
      </p>
      {SIZES.map((size) => (
        <p key={size} className={`m-0 ${size} leading-[1.25] text-heading`}>
          <span className={`${code} mr-3 inline-block w-24`}>{size}</span>
          Track every application
        </p>
      ))}
      <div className="flex flex-wrap gap-6">
        {WEIGHTS.map((weight) => (
          <span key={weight} className="text-lg text-heading" style={{ fontWeight: weight }}>
            Weight {weight}
          </span>
        ))}
      </div>
    </div>
  );
}

const STEPS = [1, 2, 3, 4, 6, 8, 12, 16];

/** Tailwind's spacing unit, as globals.css compiles it (Tailwind's default unless @theme sets one). */
export function Spacing() {
  // Storybook renders in the browser only, so the stylesheet is already applied.
  const [unit] = useState(() => getComputedStyle(document.documentElement).getPropertyValue("--spacing").trim());
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm">
        <span className={code}>--spacing</span>: {unit}. Utilities such as <span className={code}>p-4</span> are
        multiples of it.
      </p>
      {STEPS.map((step) => (
        <div key={step} className="flex items-center gap-3">
          <span className={`${code} w-10`}>{step}</span>
          <span aria-hidden className="block h-4 rounded-control bg-brand" style={{ width: `calc(var(--spacing) * ${step})` }} />
        </div>
      ))}
    </div>
  );
}

export function Radii() {
  return (
    <div className="flex flex-wrap gap-6">
      {radii.map(({ name, value }) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <span aria-hidden className="block size-20 border-2 border-line-brand bg-card" style={{ borderRadius: `var(--${name})` }} />
          <span className={code}>--{name}</span>
          <span className="text-xs">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function Shadows() {
  return (
    <div className="flex flex-wrap gap-8 p-4">
      {shadows.map(({ name }) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <span aria-hidden className="block size-20 rounded-card bg-surface-white" style={{ boxShadow: `var(--${name})` }} />
          <span className={code}>--{name}</span>
        </div>
      ))}
    </div>
  );
}
