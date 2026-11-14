"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  createApplicationAction,
  deleteApplicationAction,
  updateApplicationAction,
} from "@/app/dashboard/actions";
import { ApplicationWhen } from "@/components/application-when";
import { EditApplicationForm } from "@/components/edit-application-modal";
import { Modal } from "@/components/modal";
import {
  Badge,
  buttonClasses,
  dangerButtonClasses,
  inputClasses,
  SampleBadge,
  toneClasses,
  type Tone,
} from "@/components/ui";
import {
  INTERVIEW_OPTIONS,
  isDone,
  nextInterview,
  OUTCOME_OPTIONS,
  OUTCOMES,
  STATUS_OPTIONS,
  WAITING_OPTION,
  type Application,
  type ApplicationFields,
} from "@/lib/applications";

// ---------------------------------------------------------------------------
// Editing: cells save through this context, so the column definitions can stay at module scope.

type Editing = {
  /** Bumped after a failed save so editors drop the rejected value. */
  resetKey: number;
  save: (app: Application, changes: Partial<ApplicationFields>) => void;
  confirmDelete: (app: Application) => void;
  edit: (app: Application) => void;
};

const EditingContext = createContext<Editing | null>(null);

function useEditing() {
  const editing = useContext(EditingContext);
  if (!editing) throw new Error("Table cells must render inside ApplicationsTable");
  return editing;
}

const cellInput =
  "w-full rounded-control border border-transparent bg-transparent px-2 py-1.5 text-sm text-heading transition-all duration-200 placeholder:text-body-subtle hover:border-line-medium focus:border-line-brand focus:bg-surface-white focus:outline-none focus:ring-1 focus:ring-brand";

type TextField = "company" | "title" | "posting_url" | "location" | "salary" | "applied_on";

/** Text and date cells save when focus leaves (or on Enter); Escape restores the saved value. */
function TextCell({
  app,
  field,
  label,
  type = "text",
  required = false,
  placeholder,
}: {
  app: Application;
  field: TextField;
  label: string;
  type?: "text" | "url" | "date";
  required?: boolean;
  placeholder?: string;
}) {
  const { save, resetKey } = useEditing();
  const saved = app[field] ?? "";

  return (
    <input
      key={`${app.updated_at}-${resetKey}`}
      type={type}
      defaultValue={saved}
      required={required}
      placeholder={placeholder}
      aria-label={`${label}, ${app.company}`}
      className={cellInput}
      onKeyDown={(e) => commitKeys(e, saved)}
      onBlur={(e) => {
        const value = e.currentTarget.value.trim();
        if (value === saved) return;
        if (required && !value) {
          e.currentTarget.value = saved;
          return;
        }
        save(app, { [field]: value || null });
      }}
    />
  );
}

function commitKeys(e: KeyboardEvent<HTMLInputElement>, saved: string) {
  if (e.key === "Enter") e.currentTarget.blur();
  if (e.key === "Escape") {
    e.currentTarget.value = saved;
    e.currentTarget.blur();
  }
}

function PostingUrlCell({ app }: { app: Application }) {
  return (
    <div className="flex items-center gap-1">
      <TextCell app={app} field="posting_url" label="Job posting URL" type="url" placeholder="https://" />
      {app.posting_url && (
        <a
          href={app.posting_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open the ${app.company} job posting in a new tab`}
          className="shrink-0 rounded-control p-1.5 text-body transition-colors hover:bg-card hover:text-heading"
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      )}
    </div>
  );
}


/**
 * What the Application is waiting on: its next Interview, or Waiting when none is booked.
 */
function NextInterviewCell({ app }: { app: Application }) {
  const next = nextInterview(app);
  if (isDone(app)) return <span className="text-body-subtle">—</span>;
  const option = next ? INTERVIEW_OPTIONS[next.kind] : WAITING_OPTION;
  return <Badge tone={option.tone}>{option.label}</Badge>;
}

function WhenCell({ app }: { app: Application }) {
  return <ApplicationWhen app={app} />;
}

/**
 * Status and Outcome in one dropdown: In Progress, or Done with one of the Outcomes. It saves as
 * soon as a value is picked and takes the colour of the chosen value.
 */
function StatusCell({ app }: { app: Application }) {
  const { save, resetKey } = useEditing();
  return <StatusSelect key={`${app.updated_at}-${resetKey}`} app={app} onChange={(changes) => save(app, changes)} />;
}

function StatusSelect({
  app,
  onChange,
}: {
  app: Application;
  onChange: (changes: Pick<ApplicationFields, "status" | "outcome">) => void;
}) {
  const [value, setValue] = useState<string>(app.outcome ?? "in_progress");
  const tone: Tone = value === "in_progress" ? STATUS_OPTIONS.in_progress.tone : OUTCOME_OPTIONS[value as keyof typeof OUTCOME_OPTIONS].tone;

  return (
    <div className="relative inline-flex">
      <select
        value={value}
        aria-label={`Status, ${app.company}`}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(
            e.target.value === "in_progress"
              ? { status: "in_progress", outcome: null }
              : { status: "done", outcome: e.target.value as ApplicationFields["outcome"] },
          );
        }}
        className={`cursor-pointer appearance-none rounded-full border py-0.5 pr-7 pl-2.5 text-xs font-medium leading-5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${toneClasses[tone]}`}
      >
        <option value="in_progress" className="bg-surface-white text-heading">
          {STATUS_OPTIONS.in_progress.label}
        </option>
        <optgroup label="Done">
          {OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome} className="bg-surface-white text-heading">
              {OUTCOME_OPTIONS[outcome].label}
            </option>
          ))}
        </optgroup>
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2" aria-hidden />
    </div>
  );
}

function ActionsCell({ app }: { app: Application }) {
  const { confirmDelete, edit } = useEditing();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => edit(app)}
        aria-label={`Edit Interviews, ${app.company}, ${app.title}`}
        className="rounded-control p-1.5 text-body transition-colors hover:bg-card hover:text-heading"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => confirmDelete(app)}
        aria-label={`Delete ${app.company}, ${app.title}`}
        className="rounded-control p-1.5 text-body transition-colors hover:bg-danger-soft hover:text-fg-danger"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Columns

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
});

const helper = createColumnHelper<typeof features, Application>();

/** Sort dropdown columns in list order; blanks last. */
function orderOf(list: readonly string[], value: string | null) {
  return value === null ? undefined : list.indexOf(value);
}

const STATUS_ORDER = ["in_progress", ...OUTCOMES] as const;

const columns = helper.columns([
  helper.accessor("company", {
    header: "Company",
    sortFn: "text",
    cell: ({ row }) =>
      row.original.is_sample ? (
        <div className="flex items-center gap-1 [&>input]:min-w-0">
          <TextCell app={row.original} field="company" label="Company" required />
          <SampleBadge />
        </div>
      ) : (
        <TextCell app={row.original} field="company" label="Company" required />
      ),
  }),
  helper.accessor("title", {
    header: "Title",
    sortFn: "text",
    cell: ({ row }) => <TextCell app={row.original} field="title" label="Title" required />,
  }),
  helper.accessor((a) => orderOf(STATUS_ORDER, a.outcome ?? "in_progress"), {
    id: "status",
    header: "Status",
    sortFn: "basic",
    cell: ({ row }) => <StatusCell app={row.original} />,
  }),
  helper.accessor((a) => (isDone(a) ? undefined : (nextInterview(a)?.kind ?? "waiting")), {
    id: "next_interview",
    header: "Next interview",
    sortFn: "text",
    sortUndefined: "last",
    cell: ({ row }) => <NextInterviewCell app={row.original} />,
  }),
  helper.accessor((a) => nextInterview(a)?.at ?? undefined, {
    id: "next_interview_at",
    header: "When",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => <WhenCell app={row.original} />,
  }),
  helper.accessor("applied_on", {
    header: "Applied",
    sortFn: "basic",
    cell: ({ row }) => <TextCell app={row.original} field="applied_on" label="Applied date" type="date" required />,
  }),
  helper.accessor((a) => a.location ?? undefined, {
    id: "location",
    header: "Location",
    sortFn: "text",
    sortUndefined: "last",
    cell: ({ row }) => <TextCell app={row.original} field="location" label="Location" placeholder="Remote" />,
  }),
  helper.accessor((a) => a.salary ?? undefined, {
    id: "salary",
    header: "Salary",
    sortFn: "text",
    sortUndefined: "last",
    cell: ({ row }) => <TextCell app={row.original} field="salary" label="Salary" placeholder="$150k–$180k" />,
  }),
  helper.accessor((a) => a.posting_url ?? undefined, {
    id: "posting_url",
    header: "Job posting",
    sortFn: "text",
    sortUndefined: "last",
    cell: ({ row }) => <PostingUrlCell app={row.original} />,
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <ActionsCell app={row.original} />,
  }),
]);

const columnWidths: Record<string, string> = {
  company: "min-w-64",
  title: "min-w-48",
  next_interview_at: "min-w-52",
  applied_on: "min-w-40",
  location: "min-w-36",
  salary: "min-w-36",
  posting_url: "min-w-56",
};

// ---------------------------------------------------------------------------
// Table

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  const doneCount = applications.filter(isDone).length;
  const data = useMemo(
    () => (showDone ? applications : applications.filter((a) => !isDone(a))),
    [applications, showDone],
  );

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    initialState: { sorting: [{ id: "next_interview_at", desc: false }] },
    enableSortingRemoval: false,
  });

  const editing = useMemo<Editing>(
    () => ({
      resetKey,
      confirmDelete: setPendingDelete,
      edit: (app) => setEditingId(app.id),
      save(app, changes) {
        setError(null);
        startTransition(async () => {
          const result = await updateApplicationAction(app.id, changes);
          if (!result.ok) {
            setError(`Couldn’t save ${app.company}: ${result.error}`);
            setResetKey((k) => k + 1);
          }
        });
      },
    }),
    [resetKey],
  );

  const rows = table.getRowModel().rows;
  // Looked up by id, so the modal shows the Interviews as saved after each change.
  const editingApp = applications.find((a) => a.id === editingId) ?? null;

  return (
    <EditingContext value={editing}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id="apps-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
          All applications
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {doneCount > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-heading">
              <input
                type="checkbox"
                checked={showDone}
                onChange={(e) => setShowDone(e.target.checked)}
                className="size-4 cursor-pointer rounded-control accent-brand"
              />
              Show done ({doneCount})
            </label>
          )}
          <button type="button" onClick={() => setAdding(true)} className={buttonClasses("brand", "sm")}>
            <Plus className="size-4" aria-hidden />
            Add application
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-control border border-line-danger-subtle bg-danger-soft px-4 py-3 text-sm text-fg-danger"
        >
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-12 text-center">
          <p className="m-0 text-base font-medium text-heading">No applications yet</p>
          <p className="m-0 max-w-[48ch] text-sm text-body">
            Bigfoot’s out there somewhere. Add the roles you’ve applied to, then edit every field
            right here in the table.
          </p>
          <button type="button" onClick={() => setAdding(true)} className={buttonClasses("brand", "md")}>
            <Plus className="size-4" aria-hidden />
            Add your first application
          </button>
        </div>
      ) : (
        // tables.md: scrollable wrapper, row headers with scope="row", no border on the last row.
        <div
          // relative: keeps sr-only (absolute) labels inside the scroll area instead of widening the page.
          className="relative overflow-x-auto rounded-card border border-line bg-surface shadow-xs"
          aria-busy={isSaving}
        >
          <table className="w-full border-collapse text-left text-sm text-body">
            <caption className="sr-only">
              All applications. Edit any field in place; changes save when you leave the field.
            </caption>
            <thead className="border-b border-line bg-surface">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
                        className={`px-4 py-3 font-medium whitespace-nowrap ${columnWidths[header.column.id] ?? ""}`}
                      >
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-mx-1 inline-flex items-center gap-1 rounded-control px-1 font-medium text-body transition-colors hover:text-heading"
                          >
                            <table.FlexRender header={header} />
                            <SortIcon sorted={sorted} />
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`bg-surface-white transition-colors hover:bg-surface ${
                    i < rows.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  {row.getAllCells().map((cell) =>
                    cell.column.id === "company" ? (
                      <th key={cell.id} scope="row" className="px-4 py-2 font-medium text-heading">
                        <table.FlexRender cell={cell} />
                      </th>
                    ) : (
                      <td key={cell.id} className="px-4 py-2">
                        <table.FlexRender cell={cell} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr className="bg-surface-white">
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-body">
                    Every application is done. Turn on “Show done” to see them.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Add application">
        <AddApplicationForm onDone={() => setAdding(false)} />
      </Modal>

      <Modal open={editingApp !== null} onClose={() => setEditingId(null)} title="Edit application" wide>
        {editingApp && <EditApplicationForm app={editingApp} onDone={() => setEditingId(null)} />}
      </Modal>

      <Modal open={pendingDelete !== null} onClose={() => setPendingDelete(null)} title="Delete application?">
        {pendingDelete && <DeleteConfirmation app={pendingDelete} onDone={() => setPendingDelete(null)} />}
      </Modal>
    </EditingContext>
  );
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return <Icon className={`size-3.5 ${sorted ? "text-heading" : "text-body-subtle"}`} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Dialogs

const formInput = inputClasses;

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-heading">
        {label}
      </label>
      {children}
    </div>
  );
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function AddApplicationForm({ onDone }: { onDone: () => void }) {
  const [today] = useState(todayLocal);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim() || null;
    startTransition(async () => {
      const result = await createApplicationAction({
        company: text("company") ?? "",
        title: text("title") ?? "",
        posting_url: text("posting_url"),
        applied_on: text("applied_on") ?? today,
      });
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 pt-6">
      <Field id="new-company" label="Company">
        <input id="new-company" name="company" required autoFocus className={formInput} />
      </Field>
      <Field id="new-title" label="Title">
        <input id="new-title" name="title" required className={formInput} />
      </Field>
      <Field id="new-posting-url" label="Job posting URL (optional)">
        <input id="new-posting-url" name="posting_url" type="url" placeholder="https://" className={formInput} />
      </Field>
      <Field id="new-applied-on" label="Applied">
        <input id="new-applied-on" name="applied_on" type="date" required defaultValue={today} className={formInput} />
      </Field>
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        <button type="button" onClick={onDone} className={buttonClasses("secondary", "md")}>
          Cancel
        </button>
        <button type="submit" disabled={isPending} className={`${buttonClasses("brand", "md")} disabled:opacity-60`}>
          {isPending ? "Adding…" : "Add application"}
        </button>
      </div>
    </form>
  );
}

function DeleteConfirmation({ app, onDone }: { app: Application; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteApplicationAction(app.id);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      <p className="m-0 text-base leading-[1.625] text-body">
        <span className="font-medium text-heading">
          {app.company}, {app.title}
        </span>{" "}
        will be deleted. This can’t be undone.
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm text-fg-danger">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end gap-3 border-t border-line pt-4">
        <button type="button" onClick={onDone} autoFocus className={buttonClasses("secondary", "md")}>
          Cancel
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={isPending}
          className={dangerButtonClasses}
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
