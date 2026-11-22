"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Calendar } from "@/components/ui/calendar";
import { inputClasses } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const displayFormat = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" });

/** A `yyyy-mm-dd` value as a local date, or undefined when blank or not a date. */
function parseDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** A local date as `yyyy-mm-dd`, the value a date input would hold. */
function formatDay(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * shadcn/ui's date picker: a button that looks like a field and opens a Calendar in a Popover.
 * Its value is `yyyy-mm-dd`, or "" for no date, like a date input's. Its name is `label` plus the
 * text it shows (the date or the placeholder), so a screen reader hears both.
 */
export function DatePicker({
  id,
  label,
  value,
  onChange,
  disabled,
  clearable = false,
  placeholder = "Pick a date",
  className,
  ...aria
}: {
  id: string;
  /** What the date is, such as "Applied"; the button's accessible name starts with it. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Shows Clear under the calendar, for a date that may be blank. */
  clearable?: boolean;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDay(value);
  const shown = selected ? displayFormat.format(selected) : null;

  function pick(next: string) {
    setOpen(false);
    if (next !== value) onChange(next);
  }

  return (
    // Modal, so Tab stays in the calendar until it closes, as in a dialog.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={`${label}, ${shown ?? placeholder}`}
          className={cn(
            inputClasses,
            "flex items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60",
            !shown && "text-body",
            className,
          )}
          {...aria}
        >
          <CalendarIcon className="size-4 shrink-0 text-body" aria-hidden />
          <span className="truncate">{shown ?? placeholder}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" aria-label={label}>
        <Calendar
          mode="single"
          // Weeks start on Monday, like the dashboard's Interviews calendar.
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected}
          // Clicking the picked day again unpicks it; a date that can't be blank stays picked.
          onSelect={(date?: Date) => {
            if (date) pick(formatDay(date));
            else if (clearable) pick("");
            else setOpen(false);
          }}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the popover opened from this button; focus moves to the picked day, as in a dialog.
          autoFocus
        />
        {clearable && selected && (
          <div className="flex justify-end border-t border-line px-3 py-2">
            <button
              type="button"
              onClick={() => pick("")}
              className="rounded-control px-3 py-1.5 text-sm font-medium text-body transition-colors hover:bg-card hover:text-heading"
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
