"use client";

import { Plus, X } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { RequiredMark, fieldLabelClasses } from "@/components/ui/field";
import { FieldError } from "@/components/ui/field-error";
import { inputClasses } from "@/components/ui/input";
import {
  PARTICIPANT_MAX_LENGTHS,
  PARTICIPANTS_PER_INTERVIEW_MAX,
  participantOption,
  type Participant,
  type ParticipantInput,
} from "@/lib/applications";

/** One person as the field holds them while typing: `key` tells rows apart, `id` marks someone already on the Application. */
export type ParticipantDraft = { key: string; id?: string; role: string; name: string };

/** The field's problem: its message, and the row it's about when it's one person's (from participantsError). */
export type ParticipantsProblem = { message: string; key?: string };

let nextKey = 0;
function newKey() {
  nextKey += 1;
  return `new-${nextKey}`;
}

/** A blank row, for someone new. */
export function blankDraft(): ParticipantDraft {
  return { key: newKey(), role: "", name: "" };
}

/** Saved Participants as rows to edit. */
export function draftsOf(participants: Participant[]): ParticipantDraft[] {
  return participants.map((p) => ({ key: p.id, id: p.id, role: p.role, name: p.name ?? "" }));
}

/**
 * What the form sends, with the row each came from: rows left fully blank are dropped, the ends
 * trimmed, and a blank name sent as null.
 */
export function participantInputs(drafts: ParticipantDraft[]): { inputs: ParticipantInput[]; keys: string[] } {
  const filled = drafts.filter((d) => d.role.trim() !== "" || d.name.trim() !== "");
  return {
    inputs: filled.map(({ id, role, name }) => ({ ...(id ? { id } : {}), role: role.trim(), name: name.trim() || null })),
    keys: filled.map((d) => d.key),
  };
}

/**
 * Participants (GLOSSARY.md): who the job seeker meets in an Interview, each a role (required) and a
 * name (optional), in rows. "Add someone you’ve met" offers the Application's other Participants
 * ("Dana Lee · Recruiter"), and Add someone new adds a blank row. Changing someone already on the
 * Application changes them on every Interview they're in, which the field says under the rows. The
 * label shows a RequiredMark; the form checks there's at least one (participantsError).
 */
export function ParticipantsField({
  id,
  value,
  onChange,
  known,
  problem,
  disabled = false,
}: {
  /** The fieldset's id; each row's inputs are `${id}-<key>-role` and `-name`, the error `${id}-error`. */
  id: string;
  value: ParticipantDraft[];
  onChange: (next: ParticipantDraft[]) => void;
  /** Everyone on the Application, to offer those not yet in this Interview. */
  known: Participant[];
  problem?: ParticipantsProblem;
  disabled?: boolean;
}) {
  const pickId = useId();
  const chosen = new Set(value.flatMap((d) => (d.id ? [d.id] : [])));
  const offered = known.filter((p) => !chosen.has(p.id));
  const full = value.length >= PARTICIPANTS_PER_INTERVIEW_MAX;
  const errorId = `${id}-error`;

  /** Adds a row and puts focus in it once it's drawn. */
  function add(draft: ParticipantDraft) {
    onChange([...value, draft]);
    requestAnimationFrame(() => document.getElementById(`${id}-${draft.key}-${draft.id ? "name" : "role"}`)?.focus());
  }

  function update(key: string, change: Partial<ParticipantDraft>) {
    onChange(value.map((d) => (d.key === key ? { ...d, ...change } : d)));
  }

  function remove(index: number) {
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    // Focus moves to the row that took its place, or the one before, or Add someone new.
    const target = next[index] ?? next[index - 1];
    requestAnimationFrame(() =>
      (target ? document.getElementById(`${id}-${target.key}-role`) : document.getElementById(`${id}-add`))?.focus(),
    );
  }

  return (
    <fieldset
      id={id}
      aria-labelledby={`${id}-label`}
      aria-describedby={problem ? errorId : undefined}
      className="m-0 min-w-0 border-0 p-0"
    >
      <div className={fieldLabelClasses}>
        <span id={`${id}-label`}>Who you’re meeting</span>
        <RequiredMark />
      </div>
      {value.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {value.map((draft, index) => {
            const invalid = problem?.key === draft.key;
            const person = draft.name.trim() || draft.role.trim() || `person ${index + 1}`;
            return (
              <li key={draft.key} className="grid grid-cols-[1fr_auto] items-end gap-x-2 gap-y-2 sm:grid-cols-[1fr_1fr_auto]">
                <div className="min-w-0">
                  <label htmlFor={`${id}-${draft.key}-role`} className="mb-1 block text-xs font-medium text-heading">
                    Role
                  </label>
                  <input
                    id={`${id}-${draft.key}-role`}
                    value={draft.role}
                    required
                    disabled={disabled}
                    maxLength={PARTICIPANT_MAX_LENGTHS.role}
                    autoComplete="off"
                    placeholder="Recruiter"
                    onChange={(e) => update(draft.key, { role: e.target.value })}
                    className={inputClasses}
                    {...(invalid ? { "aria-invalid": true, "aria-describedby": errorId } : {})}
                  />
                </div>
                <div className="col-start-1 row-start-2 min-w-0 sm:col-start-auto sm:row-start-auto">
                  <label htmlFor={`${id}-${draft.key}-name`} className="mb-1 block text-xs font-medium text-heading">
                    Name <span className="font-normal text-body">(optional)</span>
                  </label>
                  <input
                    id={`${id}-${draft.key}-name`}
                    value={draft.name}
                    disabled={disabled}
                    maxLength={PARTICIPANT_MAX_LENGTHS.name}
                    autoComplete="off"
                    placeholder="Dana Lee"
                    onChange={(e) => update(draft.key, { name: e.target.value })}
                    className={inputClasses}
                  />
                </div>
                <Button
                  variant="tertiary"
                  size="sm"
                  className="row-start-1 px-2.5 sm:row-start-auto"
                  disabled={disabled}
                  aria-label={`Remove ${person}`}
                  onClick={() => remove(index)}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {value.some((d) => d.id) && (
        <p className="m-0 mt-2 text-xs text-body">Changing someone you’ve met before changes them on every Interview they’re in.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {offered.length > 0 && (
          <>
            <label htmlFor={pickId} className="sr-only">
              Add someone you’ve met
            </label>
            <select
              id={pickId}
              value=""
              disabled={disabled || full}
              onChange={(e) => {
                const person = offered.find((p) => p.id === e.target.value);
                if (person) add({ key: person.id, id: person.id, role: person.role, name: person.name ?? "" });
              }}
              className={`${inputClasses} w-auto max-w-full`}
            >
              <option value="" disabled>
                Add someone you’ve met
              </option>
              {offered.map((p) => (
                <option key={p.id} value={p.id}>
                  {participantOption(p)}
                </option>
              ))}
            </select>
          </>
        )}
        <Button id={`${id}-add`} variant="secondary" size="sm" disabled={disabled || full} onClick={() => add(blankDraft())}>
          <Plus className="size-4" aria-hidden />
          {offered.length > 0 ? "Add someone new" : "Add someone"}
        </Button>
      </div>
      <FieldError id={errorId} error={problem?.message} />
    </fieldset>
  );
}

/** The field's problem from what the form would send: participantsError's message, tied to the row it's about. */
export function participantsProblem(
  error: { message: string; index?: number } | null,
  keys: string[],
): ParticipantsProblem | undefined {
  if (!error) return undefined;
  return { message: error.message, key: error.index === undefined ? undefined : keys[error.index] };
}
