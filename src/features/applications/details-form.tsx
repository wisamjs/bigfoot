"use client";

import { Eye, EyeOff, Pencil } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { updateApplicationAction } from "@/app/applications/actions";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/ui/external-link";
import { RequiredNote } from "@/components/ui/field";
import { SaveStatus } from "@/components/ui/save-status";
import { useIsClient } from "@/hooks/use-is-client";
import { useSaveStatus } from "@/hooks/use-save-status";
import { DaysFromToday } from "@/features/applications/application-when";
import { useUnsavedChanges } from "@/features/applications/unsaved-changes";
import {
  apiValue,
  DETAIL_FIELDS,
  DetailsFields,
  FormAlert,
  type DetailField,
  type DetailValues,
  useDetails,
} from "@/features/applications/details-fields";
import { parseDay, type Application } from "@/lib/applications";

/** What screen readers hear before each detail's save status. */
const LABELS: Record<DetailField, string> = {
  company: "Company",
  title: "Title",
  applied_on: "Applied date",
  location: "Location",
  office_days: "Days in office",
  salary: "Salary",
  posting_url: "Job posting URL",
};

/** The details as the Application has them saved: what each field is compared with when it's left. */
function savedDetails(app: Application): DetailValues {
  return {
    company: app.company,
    title: app.title,
    applied_on: app.applied_on,
    location: app.location ?? "",
    office_days: app.office_days ? String(app.office_days) : "",
    salary: app.salary ?? "",
    posting_url: app.posting_url ?? "",
  };
}

/**
 * The Application page's Details card (BIG-174). It shows the applied date, the salary (hidden
 * behind Reveal each time the page opens) and the job posting as text, and its edit button turns
 * every detail, company and title included, into fields. Each field saves by itself when it's left
 * (the applied date and Location, when picked), and only if it changed, so every value saved was
 * checked first. A field that fails its check shows why beside it, keeps what was typed, and isn't
 * sent. Done goes back to the text, unless a field still needs fixing: then focus goes there.
 *
 * What's typed and each field's save status live here, not in the fields, so they outlast both a
 * save re-rendering the page and Done. A field only takes the saved value in when it changes
 * elsewhere and nothing was typed over the old one, so a save never resets a field being typed in.
 */
export function DetailsCard({ app }: { app: Application }) {
  const saved = savedDetails(app);
  const [seen, setSeen] = useState(saved);
  const [editing, setEditing] = useState(false);
  const details = useDetails(saved);
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(editing);
  // One tracker per detail, so each shows its own status.
  const saves: Record<DetailField, ReturnType<typeof useSaveStatus>> = {
    company: useSaveStatus(),
    title: useSaveStatus(),
    applied_on: useSaveStatus(),
    location: useSaveStatus(),
    office_days: useSaveStatus(),
    salary: useSaveStatus(),
    posting_url: useSaveStatus(),
  };

  // Set during render, the way React advises for state that follows a prop.
  const elsewhere = DETAIL_FIELDS.filter((name) => saved[name] !== seen[name]);
  if (elsewhere.length > 0) {
    setSeen(saved);
    const untouched = elsewhere.filter((name) => details.values[name].trim() === seen[name]);
    details.adopt(Object.fromEntries(untouched.map((name) => [name, saved[name]])));
  }

  // A detail typed but not yet left, one that failed its check, or one whose save failed: each
  // still differs from what's saved.
  const unsavedDetail = DETAIL_FIELDS.find((name) => details.values[name].trim() !== saved[name]);
  const focusDetail = (name: DetailField) => document.getElementById(`${details.id}-${name}`)?.focus();
  useUnsavedChanges(unsavedDetail !== undefined, () => {
    if (unsavedDetail) focusDetail(unsavedDetail);
  });

  // Back from the fields, focus returns to the edit button that opened them.
  useEffect(() => {
    if (wasEditingRef.current && !editing) editRef.current?.focus();
    wasEditingRef.current = editing;
  }, [editing]);

  function commit(name: DetailField, value: string) {
    if (value.trim() === saved[name]) return;
    const next = apiValue(name, value);
    if (!details.checkField(name, next)) return;
    // Days in office are picked under Hybrid: sending it too keeps them valid however saves interleave.
    const changes = name === "office_days" ? { location: "hybrid" as const, office_days: next as number | null } : { [name]: next };
    void saves[name].run(async () => {
      const result = await updateApplicationAction(app.id, changes);
      if (!result.ok && result.fieldErrors) details.setFieldErrors((prev) => ({ ...prev, ...result.fieldErrors }));
      return result;
    });
  }

  function done() {
    // A field that needs fixing, or whose save failed, keeps the fields open until it's fixed.
    const stuck = DETAIL_FIELDS.find((name) => details.fieldErrors[name] || saves[name].status.phase === "failed");
    if (stuck) focusDetail(stuck);
    else setEditing(false);
  }

  return (
    <section aria-labelledby={`${details.id}-heading`} className={`card flex min-w-0 flex-col gap-5 p-5 sm:p-7 ${editing ? "border-line-brand-subtle" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${details.id}-heading`} className="m-0 text-2xl font-bold leading-[1.25] text-heading">
          {editing ? "Edit details" : "Details"}
        </h2>
        {editing ? (
          <RequiredNote />
        ) : (
          <Button ref={editRef} variant="tertiary" className="px-2.5" onClick={() => setEditing(true)} aria-label="Edit details">
            <Pencil className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      {editing ? (
        <>
          <DetailsFields
            details={details}
            app={app}
            salary
            onCommit={commit}
            status={(name) => <SaveStatus status={saves[name].status} label={LABELS[name]} onRetry={saves[name].retry} />}
          />
          <FormAlert message={details.invalid} />
          <Button onClick={done} className="self-start">
            Done
          </Button>
        </>
      ) : (
        <DetailsText app={app} />
      )}
    </section>
  );
}

/** The details as text: the applied date and how long ago, the salary behind Reveal, and the job posting. */
function DetailsText({ app }: { app: Application }) {
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-1">
      <Detail term="Applied">
        <AppliedOn date={app.applied_on} />
      </Detail>
      <Detail term="Salary" className="order-last col-span-2 lg:order-none lg:col-span-1">
        <Salary salary={app.salary} />
      </Detail>
      <Detail term="Job posting">
        <Posting url={app.posting_url} />
      </Detail>
    </dl>
  );
}

function Detail({ term, className = "", children }: { term: string; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-sm text-body">{term}</dt>
      <dd className="m-0 mt-1 break-words text-base font-medium text-heading">{children}</dd>
    </div>
  );
}

const appliedFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/** "Oct 28, 2026 · 26 days ago" (the second part from sm up). */
function AppliedOn({ date }: { date: string }) {
  // The viewer's locale formats it, which the server doesn't know.
  const isClient = useIsClient();
  return (
    <>
      <time dateTime={date}>{isClient ? appliedFormat.format(parseDay(date)) : date}</time>
      <span className="hidden font-normal text-body sm:inline">
        {" · "}
        <DaysFromToday date={date} />
      </span>
    </>
  );
}

/** Dots and Reveal, against someone looking at the screen; the salary once revealed, and Hide. */
function Salary({ salary }: { salary: string | null }) {
  const [revealed, setRevealed] = useState(false);
  if (!salary) return <NotAdded />;
  return (
    <span className="flex items-center justify-between gap-3">
      {revealed ? (
        <span className="min-w-0 break-words">{salary}</span>
      ) : (
        <span className="tracking-[0.2em]">
          <span aria-hidden>••••••••</span>
          <span className="sr-only">Hidden</span>
        </span>
      )}
      <Button variant="secondary" size="sm" className="shrink-0" onClick={() => setRevealed(!revealed)}>
        {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        {revealed ? "Hide" : "Reveal"}
        <span className="sr-only"> salary</span>
      </Button>
    </span>
  );
}

/** The posting's host name ("careers.example.com"), opening the posting in a new tab. */
function Posting({ url }: { url: string | null }) {
  const host = hostName(url);
  if (!url || !host) return <NotAdded />;
  return (
    <ExternalLink href={url} className="font-medium text-fg-brand underline underline-offset-4 hover:text-fg-brand-strong">
      {host}
      <span aria-hidden> ↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </ExternalLink>
  );
}

function hostName(url: string | null): string | null {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

function NotAdded() {
  return <span className="font-normal text-body">Not added</span>;
}
