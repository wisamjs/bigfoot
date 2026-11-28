import { GoogleAuthButton } from "@/features/auth/auth-button";
import { SignInNote } from "@/features/auth/sign-in-note";

/**
 * The body of /sign-in and /sign-up. Both pages render it unchanged: signing up and signing in
 * are the same Google flow (GLOSSARY.md, Job seeker). src/proxy.ts sends signed-in job seekers on to
 * /dashboard (or to `next`) before either renders. `next` is where signing in returns to: the page a
 * signed-out job seeker tried to open.
 */
export function AuthCard({ next }: { next?: string }) {
  return (
    <div className="card mx-auto max-w-[480px] p-8 text-center">
      <h1 className="m-0 mb-2 text-[28px] font-bold leading-[1.15] text-heading md:text-[32px]">
        Welcome to Bigfoot
      </h1>
      <p className="m-0 mb-8 text-base leading-[1.7] text-body">
        Job hunting can feel like chasing Bigfoot. Let’s find yours.
      </p>
      <GoogleAuthButton size="xl" next={next}>Continue with Google</GoogleAuthButton>
      <SignInNote className="mt-6" />
    </div>
  );
}
