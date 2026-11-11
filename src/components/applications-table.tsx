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
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ExternalLink, Plus, Trash2 } from "lucide-react";
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
import { useIsClient } from "@/components/local-time";
import { Modal } from "@/components/modal";
import { buttonClasses, toneClasses, type Tone } from "@/components/ui";
import {
  isClosed,
  NEXT_ROUNDS,
  ROUND_OPTIONS,
  ROUNDS,
  STAGE_OPTIONS,
  STAGES,
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

/** <input type="datetime-local"> wants local wall-clock time; the API stores an instant. */
function toLocalInput(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function NextRoundAtCell({ app }: { app: Application }) {
  const { save, resetKey } = useEditing();
  // An empty date shows a quiet button instead of the browser's "yyyy-mm-dd, --:--" placeholder.
  const [editing, setEditing] = useState(false);
  // The server can't know the viewer's time zone, so this cell renders after hydration.
  const isClient = useIsClient();
  if (!isClient) return <div className="h-[34px]" />;

  const saved = app.next_round_at ? toLocalInput(app.next_round_at) : "";
  if (!saved && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Add next round date, ${app.company}`}
        className={`${cellInput} text-left text-body-subtle hover:text-heading`}
      >
        Add date
      </button>
    );
  }
  return (
    <input
      key={`${app.updated_at}-${resetKey}`}
      type="datetime-local"
      defaultValue={saved}
      autoFocus={editing}
      aria-label={`Next round date, ${app.company}`}
      className={cellInput}
      onKeyDown={(e) => commitKeys(e, saved)}
      onBlur={(e) => {
        setEditing(false);
        const value = e.currentTarget.value;
        if (value === saved) return;
        save(app, { next_round_at: value ? new Date(value).toISOString() : null });
      }}
    />
  );
}

type SelectField = "stage" | "previous_round" | "next_round";

const selectFields: Record<
  SelectField,
  { label: string; options: Record<string, { label: string; tone: Tone }>; order: readonly string[]; optional: boolean }
> = {
  stage: { label: "Stage", options: STAGE_OPTIONS, order: STAGES, optional: false },
  previous_round: { label: "Previous round", options: ROUND_OPTIONS, order: ROUNDS, optional: true },
  next_round: { label: "Next round", options: ROUND_OPTIONS, order: NEXT_ROUNDS, optional: true },
};

function SelectCell({ app, field }: { app: Application; field: SelectField }) {
  const { save, resetKey } = useEditing();
  return (
    <ToneSelect
      key={`${app.updated_at}-${resetKey}`}
      app={app}
      field={field}
      onChange={(value) => save(app, { [field]: value })}
    />
  );
}

/** Dropdowns save as soon as a value is picked, and take the colour of the chosen value. */
function ToneSelect({
  app,
  field,
  onChange,
}: {
  app: Application;
  field: SelectField;
  onChange: (value: string | null) => void;
}) {
  const { label, options, order, optional } = selectFields[field];
  const [value, setValue] = useState<string>(app[field] ?? "");
  const tone: Tone = value ? options[value].tone : "neutral";

  return (
    <div className="relative inline-flex">
      <select
        value={value}
        aria-label={`${label}, ${app.company}`}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value || null);
        }}
        className={`cursor-pointer appearance-none rounded-full border py-0.5 pr-7 pl-2.5 text-xs font-medium leading-5 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${toneClasses[tone]}`}
      >
        {optional && (
          <option value="" className="bg-surface-white text-heading">
            —
          </option>
        )}
        {order.map((key) => (
          <option key={key} value={key} className="bg-surface-white text-heading">
            {options[key].label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2" aria-hidden />
    </div>
  );
}

function DeleteCell({ app }: { app: Application }) {
  const { confirmDelete } = useEditing();
  return (
    <button
      type="button"
      onClick={() => confirmDelete(app)}
      aria-label={`Delete ${app.company}, ${app.title}`}
      className="rounded-control p-1.5 text-body transition-colors hover:bg-danger-soft hover:text-fg-danger"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
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

/** Sort dropdown columns in list order (hiring-process order for rounds); blanks last. */
function orderOf(list: readonly string[], value: string | null) {
  return value === null ? undefined : list.indexOf(value);
}

const columns = helper.columns([
  helper.accessor("company", {
    header: "Company",
    sortFn: "text",
    cell: ({ row }) => <TextCell app={row.original} field="company" label="Company" required />,
  }),
  helper.accessor("title", {
    header: "Title",
    sortFn: "text",
    cell: ({ row }) => <TextCell app={row.original} field="title" label="Title" required />,
  }),
  helper.accessor((a) => orderOf(STAGES, a.stage), {
    id: "stage",
    header: "Stage",
    sortFn: "basic",
    cell: ({ row }) => <SelectCell app={row.original} field="stage" />,
  }),
  helper.accessor((a) => orderOf(ROUNDS, a.previous_round), {
    id: "previous_round",
    header: "Previous round",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => <SelectCell app={row.original} field="previous_round" />,
  }),
  helper.accessor((a) => orderOf(NEXT_ROUNDS, a.next_round), {
    id: "next_round",
    header: "Next round",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => <SelectCell app={row.original} field="next_round" />,
  }),
  helper.accessor((a) => a.next_round_at ?? undefined, {
    id: "next_round_at",
    header: "Next round date",
    sortFn: "basic",
    sortUndefined: "last",
    cell: ({ row }) => <NextRoundAtCell app={row.original} />,
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
    cell: ({ row }) => <DeleteCell app={row.original} />,
  }),
]);

const columnWidths: Record<string, string> = {
  company: "min-w-40",
  title: "min-w-48",
  next_round_at: "min-w-52",
  applied_on: "min-w-40",
  location: "min-w-36",
  salary: "min-w-36",
  posting_url: "min-w-56",
};

// ---------------------------------------------------------------------------
// Table

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [showClosed, setShowClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);
  const [isSaving, startTransition] = useTransition();

  const closedCount = applications.filter((a) => isClosed(a.stage)).length;
  const data = useMemo(
    () => (showClosed ? applications : applications.filter((a) => !isClosed(a.stage))),
    [applications, showClosed],
  );

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.id,
    initialState: { sorting: [{ id: "next_round_at", desc: false }] },
    enableSortingRemoval: false,
  });

  const editing = useMemo<Editing>(
    () => ({
      resetKey,
      confirmDelete: setPendingDelete,
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

  return (
    <EditingContext value={editing}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id="apps-title" className="m-0 text-xl font-bold leading-[1.25] text-heading">
          All applications
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {closedCount > 0 && (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-heading">
              <input
                type="checkbox"
                checked={showClosed}
                onChange={(e) => setShowClosed(e.target.checked)}
                className="size-4 cursor-pointer rounded-control accent-brand"
              />
              Show closed ({closedCount})
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
                    Every application is closed. Turn on “Show closed” to see them.
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

const formInput =
  "block w-full rounded-card border border-line-medium bg-surface-white px-3 py-2.5 text-sm text-heading shadow-xs transition-all duration-200 placeholder:text-body hover:border-line-brand-subtle focus:border-line-brand focus:outline-none focus:ring-1 focus:ring-brand";

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
          className="btn border-line-danger bg-danger-soft px-4 py-2.5 text-sm text-fg-danger hover:bg-line-danger-subtle disabled:opacity-60"
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
