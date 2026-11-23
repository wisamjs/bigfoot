import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/features/auth/auth-card";
import { NEXT_PARAM, safeNext } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "Sign in · Bigfoot",
};

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  // The card without `next` is the static shell; the one that reads the search params streams in.
  return (
    <Suspense fallback={<AuthCard />}>
      <SignIn searchParams={searchParams} />
    </Suspense>
  );
}

async function SignIn({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const next = (await searchParams)[NEXT_PARAM];
  return <AuthCard next={next === undefined ? undefined : safeNext(next)} />;
}
