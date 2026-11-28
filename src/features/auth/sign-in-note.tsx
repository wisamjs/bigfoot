import Link from "next/link";

const link =
  "rounded-control text-fg-brand underline underline-offset-4 transition-colors hover:no-underline";

/** Shown with the sign-in buttons: what signing in agrees to, and what Google shares. */
export function SignInNote({ className = "" }: { className?: string }) {
  return (
    <p className={`m-0 text-sm leading-[1.6] text-body ${className}`}>
      By continuing, you agree to our{" "}
      <Link href="/terms" className={link}>
        Terms
      </Link>{" "}
      and acknowledge our{" "}
      <Link href="/privacy" className={link}>
        Privacy Policy
      </Link>
      . Signing in with Google shares your name, email, and photo with Bigfoot.
    </p>
  );
}
