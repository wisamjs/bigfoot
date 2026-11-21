import type { ReactNode } from "react";

export type Tone =
  | "brand"
  | "neutral"
  | "success"
  | "warning"
  | "dark"
  | "purple"
  | "slate"
  | "blue"
  | "green"
  | "yellow"
  | "orange"
  | "red"
  | "gray";

// badges.md variants, plus the Round and Stage colours (globals.css --tone-*).
export const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-softer border-line-brand-subtle text-fg-brand-strong",
  neutral: "bg-surface border-line text-heading",
  success: "bg-success-soft border-line-success-subtle text-fg-success-strong",
  warning: "bg-warning-soft border-line-warning-subtle text-fg-warning",
  dark: "bg-brand border-transparent text-on-brand",
  purple: "bg-tone-purple border-tone-purple-line text-tone-purple-fg",
  slate: "bg-tone-slate border-tone-slate-line text-tone-slate-fg",
  blue: "bg-tone-blue border-tone-blue-line text-tone-blue-fg",
  green: "bg-tone-green border-tone-green-line text-tone-green-fg",
  yellow: "bg-tone-yellow border-tone-yellow-line text-tone-yellow-fg",
  orange: "bg-tone-orange border-tone-orange-line text-tone-orange-fg",
  red: "bg-tone-red border-tone-red-line text-tone-red-fg",
  gray: "bg-tone-gray border-tone-gray-line text-tone-gray-fg",
};

export function Badge({
  tone = "neutral",
  pill = false,
  children,
}: {
  tone?: Tone;
  pill?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex w-auto items-center gap-1 border px-1.5 py-0.5 text-xs font-medium leading-4 ${
        pill ? "rounded-full px-2.5" : "rounded-control"
      } ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
