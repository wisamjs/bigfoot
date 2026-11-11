import type { ReactNode } from "react";
import { signInWithGoogle, signOutAction } from "@/app/actions";
import { buttonClasses } from "@/components/ui";

type Props = {
  children: ReactNode;
  variant?: "brand" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

/** Sign up / Sign in: both start the Google OAuth flow via a server action. */
export function GoogleAuthButton({ children, variant = "brand", size = "md", className = "" }: Props) {
  return (
    <form action={signInWithGoogle} className={className}>
      <button type="submit" className={`${buttonClasses(variant, size)} w-full`}>
        {children}
      </button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className={buttonClasses("tertiary", "sm")}>
        Sign out
      </button>
    </form>
  );
}
