import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountPage, AccountPageSkeleton } from "@/features/account/account-page";
import { API_URL, listAccessTokens, listApplications, listShareLinks } from "@/lib/api";
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
    listApplications(user.id),
    listAccessTokens(user.id),
    listShareLinks(user.id),
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
