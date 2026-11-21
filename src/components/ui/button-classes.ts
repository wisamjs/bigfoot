import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "./button";

/** Button classes for an element that can't be a <Button>, such as a <Link> or the skip link. */
export function buttonClasses(
  variant: VariantProps<typeof buttonVariants>["variant"] = "brand",
  size: VariantProps<typeof buttonVariants>["size"] = "md",
) {
  return buttonVariants({ variant, size });
}
