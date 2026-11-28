import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountPage, AccountPageSkeleton } from "@/features/account/account-page";
import { API_URL, getAccessTokens, getApplications, getShareLinks } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Account · Bigfoot",
};

export default function Page() {
  return (
    <Suspense fallback={<AccountPageSkeleton />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await getCurrentUser();
  const [applications, accessTokens, shareLinks] = await Promise.all([
    // Kept for a few minutes, so going back to Account, or opening it from a prefetch, shows it at once.
    getApplications(user.id),
    getAccessTokens(user.id),
    getShareLinks(user.id),
  ]);
  return (
    <AccountPage
      user={user}
      count={applications.length}
      accessTokens={accessTokens}
      shareLinks={shareLinks}
      apiUrl={API_URL}
    />
  );
}
