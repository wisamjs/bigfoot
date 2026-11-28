import { Pencil } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "cn";
import { Button, buttonVariants } from "./button";

/** The icon-only tertiary look, square around the 16px pencil. */
const EDIT_CLASSES = "touch-target px-2.5";

/**
 * A card's Edit (BIG-240): an icon-only tertiary button with a pencil, named by `label`, such as
 * "Edit details" or "Edit Prep notes". An action for the whole page is a labelled tertiary Button
 * instead.
 */
function EditButton({ label, className, ...props }: Omit<ComponentProps<"button">, "children"> & { label: string }) {
  return (
    <Button variant="tertiary" aria-label={label} className={cn(EDIT_CLASSES, className)} {...props}>
      <Pencil className="size-4" aria-hidden />
    </Button>
  );
}

/**
 * EditButton's look, for the eye only, inside a link that already says where it goes (a completed
 * Interview's row). It follows the link's hover through the `group` class on the link.
 */
function EditMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        buttonVariants({ variant: "tertiary" }),
        EDIT_CLASSES,
        "group-hover:bg-card group-hover:text-heading",
        className,
      )}
    >
      <Pencil className="size-4" />
    </span>
  );
}

export { EditButton, EditMark };
