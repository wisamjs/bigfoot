import type { ReactNode } from "react";

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

/** brand.md: no logo set, so use a text mark based on the project name. */
export function Wordmark() {
  return <span className="text-xl font-bold text-heading">Bigfoot</span>;
}

/** layout.md: max-width 1152px, centered, 24px horizontal padding. */
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

type Tone = "brand" | "neutral" | "success" | "warning";

// badges.md variants
const tones: Record<Tone, string> = {
  brand: "bg-brand-softer border-line-brand-subtle text-fg-brand-strong",
  neutral: "bg-surface border-line text-heading",
  success: "bg-success-soft border-line-success-subtle text-fg-success-strong",
  warning: "bg-warning-soft border-line-warning-subtle text-fg-warning",
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
      } ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
