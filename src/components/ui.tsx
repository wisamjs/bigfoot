import type { ReactNode } from "react";
import { Footprints, Sparkles } from "lucide-react";

type Variant = "brand" | "secondary" | "tertiary";
type Size = "sm" | "md" | "lg" | "xl";

// buttons.md size table
const sizes: Record<Size, string> = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
  xl: "px-6 py-3.5 text-base",
};

export function buttonClasses(variant: Variant = "brand", size: Size = "md") {
  return `btn btn-${variant} ${sizes[size]}`;
}

/** buttons.md danger variant, base size: for actions that delete something for good. */
export const dangerButtonClasses =
  "btn border-line-danger bg-danger-soft px-4 py-2.5 text-sm text-fg-danger hover:bg-line-danger-subtle disabled:cursor-not-allowed disabled:opacity-60";

/** inputs.md: full width, contrasting background, brand focus ring. */
export const inputClasses =
  "block w-full rounded-card border border-line-medium bg-surface-white px-3 py-2.5 text-sm text-heading shadow-xs transition-all duration-200 placeholder:text-body hover:border-line-brand-subtle focus:border-line-brand focus:outline-none focus:ring-1 focus:ring-brand";

/** Text mark plus a footprint: job hunting is chasing Bigfoot. Matches src/app/icon.svg. */
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-bold text-heading">
      <Footprints className="size-5 text-fg-brand" aria-hidden />
      Bigfoot
    </span>
  );
}

/** layout.md: max-width 1152px, centred, 24px horizontal padding. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1152px] px-6 ${className}`}>{children}</div>;
}

/** Section header: eyebrow, h2 (28/36/44), lead (20px), 48px below. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  id,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  id: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-[768px] text-center">
      <Badge tone="brand" pill>
        {eyebrow}
      </Badge>
      <h2
        id={id}
        className="mt-4 text-[28px] font-bold leading-[1.15] text-heading md:text-[36px] lg:text-[44px]"
      >
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-[70ch] text-lg leading-[1.7] text-body lg:text-xl">{lead}</p>
    </div>
  );
}

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

/**
 * Marks a Sample Application (GLOSSARY.md). Says "Sample" in text, so it never relies on colour,
 * and stays on the Application after the job seeker edits it.
 */
export function SampleBadge() {
  return (
    <span title="Bigfoot added this to show how it works. Edit or delete it any time." className="inline-flex">
      <Badge tone="neutral">
        <Sparkles className="size-3" aria-hidden />
        Sample
      </Badge>
    </span>
  );
}
