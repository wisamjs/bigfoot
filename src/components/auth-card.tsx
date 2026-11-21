import { GoogleAuthButton } from "@/components/auth-button";
import { RedirectIfSignedIn } from "@/components/redirect-if-signed-in";
import { SignInNote } from "@/components/sign-in-note";

/**
 * The body of /sign-in and /sign-up. Both pages render it unchanged: signing up and signing in
 * are the same Google flow (GLOSSARY.md, Job seeker).
 */
export function AuthCard() {
  return (
    <>
      <RedirectIfSignedIn />
      <div className="card mx-auto max-w-[480px] p-8 text-center">
        <h1 className="m-0 mb-2 text-[28px] font-bold leading-[1.15] text-heading md:text-[32px]">
          Welcome to Bigfoot
        </h1>
        <p className="m-0 mb-8 text-base leading-[1.7] text-body">
          Job hunting is chasing Bigfoot. Let’s find yours.
        </p>
        <GoogleAuthButton size="xl">Continue with Google</GoogleAuthButton>
        <SignInNote className="mt-6" />
      </div>
    </>
  );
}
