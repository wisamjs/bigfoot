import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { interviewHref } from "@/features/applications/routes";
import { roundNumber, type Application, type Interview } from "@/lib/applications";

const linkClasses =
  "touch-target inline-flex min-w-0 items-center gap-1.5 rounded-control text-base font-semibold text-fg-brand transition-colors hover:text-fg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/**
 * The foot of an Interview page (BIG-202): links to the Application's Interviews either side of this
 * one by Round, "← Round 1 · Recruiter Screen" on the left and "Round 3 · Technical Deep-Dive →" on
 * the right. A side without an Interview stays empty; nothing at all when this is the only one. On a
 * phone they stack and shorten to "R1 · Recruiter Screen".
 */
export function RoundNav({ app, interview }: { app: Application; interview: Interview }) {
  const round = roundNumber(app, interview);
  const byRound = (r: number) => app.interviews.find((i) => roundNumber(app, i) === r);
  const previous = byRound(round - 1);
  const next = byRound(round + 1);
  if (!previous && !next) return null;
  return (
    <nav aria-label="Other Rounds" className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      {previous ? (
        <Link href={interviewHref(app.id, previous.id)} className={linkClasses}>
          <ArrowLeft className="size-4" aria-hidden />
          <span className="break-words">
            <span className="sr-only">Previous: </span>
            <RoundLabel round={round - 1} title={previous.title} />
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next && (
        <Link href={interviewHref(app.id, next.id)} className={`${linkClasses} sm:ml-auto sm:text-right`}>
          <span className="break-words">
            <span className="sr-only">Next: </span>
            <RoundLabel round={round + 1} title={next.title} />
          </span>
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </nav>
  );
}

/** "Round 1 · Recruiter Screen", or "R1 · Recruiter Screen" on a phone. */
function RoundLabel({ round, title }: { round: number; title: string }) {
  return (
    <>
      <span className="sm:hidden">R{round}</span>
      <span className="hidden sm:inline">Round {round}</span> · {title}
    </>
  );
}
