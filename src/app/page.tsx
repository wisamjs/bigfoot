import { Suspense } from "react";
import { AccountDeletedNotice } from "@/features/landing/account-deleted-notice";
import { LandingPage } from "@/features/landing/landing-page";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <LandingPage
      notice={
        <Suspense>
          <AccountDeletedNotice searchParams={searchParams} />
        </Suspense>
      }
    />
  );
}
