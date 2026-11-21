import { CircleCheck } from "lucide-react";
import { Container } from "@/components/ui";

/**
 * Shown on the landing page after a job seeker deletes their account (ACCOUNT_DELETED_PATH).
 * Reads searchParams, so it renders inside a <Suspense> boundary and the rest of the page stays
 * in the static shell.
 */
export async function AccountDeletedNotice({ searchParams }: { searchParams: Promise<Record<string, unknown>> }) {
  if ((await searchParams).account !== "deleted") return null;
  return (
    <Container className="pt-8">
      {/* alerts.md success variant */}
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- <output> allows only phrasing content, and this notice holds paragraphs. */}
      <div
        role="status"
        className="flex items-start gap-3 rounded-card border border-line-success-subtle bg-success-soft p-4 text-sm leading-[1.6] text-fg-success-strong"
      >
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <p className="m-0 text-base font-medium">Your account is deleted</p>
          <p className="m-0">
            Your account and all of your Applications are gone, and you’re signed out. Thanks for
            using Bigfoot.
          </p>
        </div>
      </div>
    </Container>
  );
}
