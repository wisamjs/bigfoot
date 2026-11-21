import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "cn";

/**
 * buttons.md: the look comes from Candy's .btn classes in globals.css (radius, rim, glint); the
 * size table and the danger variant are utilities. Disabled buttons fade and say so on hover.
 * `aria-disabled` looks the same but keeps focus: use it on a submit button while its form is
 * pending, so focus stays in place for the error or result that follows.
 */
const buttonVariants = cva(
  "btn disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        brand: "btn-brand",
        secondary: "btn-secondary",
        tertiary: "btn-tertiary",
        /** For actions that delete something for good. */
        danger: "border-line-danger bg-danger-soft text-fg-danger hover:bg-line-danger-subtle",
      },
      size: {
        sm: "px-3 py-2 text-sm",
        md: "px-4 py-2.5 text-sm",
        lg: "px-5 py-3 text-base",
        xl: "px-6 py-3.5 text-base",
      },
    },
    defaultVariants: { variant: "brand", size: "md" },
  },
);

/** A Candy button. `asChild` styles its one child instead, such as a Next.js <Link>. */
function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      // A <button> defaults to type="button" here, so it never submits a form by accident.
      type={asChild ? undefined : type}
      {...props}
    />
  );
}

export { Button, buttonVariants };
