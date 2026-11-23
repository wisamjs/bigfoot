import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-classes";
import { RecentlyViewed, type ViewedApplication } from "@/features/applications/recently-viewed";
import { EmptyFolderBigfoot } from "@/features/shell/illustrations";

export const NOT_FOUND_TITLE = "Application not found";

/**
 * What the Application page shows for a deleted Application, a malformed id and another job
 * seeker's Application alike (BIG-174): Bigfoot with an empty folder, why it may be missing, Back
 * to dashboard, and the Applications this browser opened recently that still exist.
 */
export function ApplicationNotFound({ applications }: { applications: ViewedApplication[] }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <EmptyFolderBigfoot className="h-auto w-[240px] max-w-full" />
      <div className="flex max-w-[600px] flex-col gap-3">
        <h1 className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.02em] text-heading md:text-[44px]">
          {NOT_FOUND_TITLE}
        </h1>
        <p className="m-0 text-lg leading-[1.6] text-body">
          It may have been deleted, or the link may be wrong. Everything else you’ve added is on your dashboard.
        </p>
      </div>
      <Link href="/dashboard" className={buttonClasses("brand", "lg")}>
        Back to dashboard
      </Link>
      <div className="mt-6 flex w-full justify-center">
        <RecentlyViewed applications={applications} />
      </div>
    </div>
  );
}
