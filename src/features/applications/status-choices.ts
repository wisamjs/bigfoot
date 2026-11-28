import { OUTCOME_OPTIONS, OUTCOMES, type Application, type Outcome, type Status } from "@/lib/applications";

/**
 * What a pick saves: the Status and Outcome the Application ends up with, and the Done date and
 * Outcome note that go with them. Marking an In Progress Application Done dates it today (the
 * viewer's today); Reopen clears both.
 */
export type StatusChange = { status: Status; outcome: Outcome | null; done_on?: string | null; outcome_note?: null };

export type StatusChoice = { label: string; change: StatusChange; separated?: boolean };

/**
 * The Change Status choices for an Application: "Mark <Outcome>" for each Outcome it doesn't already
 * have and, once it's Done, "Reopen" after a separator. `today` is the viewer's, as YYYY-MM-DD.
 * Changing the Outcome of a Done Application keeps its Done date; an Application applied for after
 * today can't have ended today, so marking it Done gives it no Done date.
 */
export function statusChoices(app: Pick<Application, "status" | "outcome" | "applied_on">, today: string): StatusChoice[] {
  const done = app.status === "done";
  const marks = OUTCOMES.filter((outcome) => outcome !== app.outcome).map(
    (outcome): StatusChoice => ({
      label: `Mark ${OUTCOME_OPTIONS[outcome].label}`,
      change: done
        ? { status: "done", outcome }
        : { status: "done", outcome, done_on: today >= app.applied_on ? today : null },
    }),
  );
  if (!done) return marks;
  return [
    ...marks,
    { label: "Reopen", change: { status: "in_progress", outcome: null, done_on: null, outcome_note: null }, separated: true },
  ];
}
