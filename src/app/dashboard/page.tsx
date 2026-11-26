import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardPage, DashboardPageSkeleton } from "@/features/dashboard/dashboard-page";
import { getApplications } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Dashboard · Bigfoot",
};

export default function Page() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const user = await getCurrentUser();
  const applications = await getApplications(user.id);
  return <DashboardPage user={user} applications={applications} now={new Date()} />;
}
