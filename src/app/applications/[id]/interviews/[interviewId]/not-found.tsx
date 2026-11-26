import type { Metadata } from "next";
import { Suspense } from "react";
import { INTERVIEW_NOT_FOUND_TITLE, InterviewNotFoundPage } from "@/features/applications/interview-page";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: `${INTERVIEW_NOT_FOUND_TITLE} · Bigfoot`,
};

/** Shown for a deleted Interview, a malformed id and another job seeker's Interview alike. */
export default function NotFound() {
  return (
    <Suspense fallback={<InterviewNotFoundPage />}>
      <Loaded />
    </Suspense>
  );
}

async function Loaded() {
  return <InterviewNotFoundPage user={await getCurrentUser()} />;
}
