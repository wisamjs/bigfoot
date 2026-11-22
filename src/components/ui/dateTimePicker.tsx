"use client";

import { useState } from "react";
import { cn } from "cn";
import { DatePicker } from "@/components/ui/datePicker";
import { inputClasses } from "@/components/ui/input";

/** A date (`yyyy-mm-dd`) and a time (`hh:mm`); either is "" until given. */
export type DateAndTime = { date: string; time: string };

/** A `yyyy-mm-ddThh:mm` value, or "" for none, as its date and time. */
export function splitDateTime(value: string): DateAndTime {
  return { date: value.slice(0, 10), time: value.slice(11, 16) };
}

/**
 * shadcn/ui's date picker with a time field beside it. No time is assumed: the time field starts
 * empty, and stays disabled until there's a date. `onChange` runs when a date is picked or
 * cleared (Clearing the date clears the time too), and when the time field is left with a new time.
 * Mount it again (with a `key`) to reset it to a new `value`.
 */
export function DateTimePicker({
  id,
  dateLabel,
  timeLabel,
  value,
  onChange,
  disabled,
  invalid,
  "aria-describedby": describedBy,
}: {
  /** The date button's id; the time field's is `${id}-time`. */
  id: string;
  /** The date button's accessible name, such as "Date, Interview 1". */
  dateLabel: string;
  /** The time field's accessible name, such as "Time, Interview 1". */
  timeLabel: string;
  /** The starting value, `yyyy-mm-ddThh:mm` or "". */
  value: string;
  onChange: (value: DateAndTime) => void;
  disabled?: boolean;
  /** Which part needs fixing, if any; it is marked invalid and described by `aria-describedby`. */
  invalid?: { date?: boolean; time?: boolean };
  "aria-describedby"?: string;
}) {
  const [date, setDate] = useState(() => splitDateTime(value).date);
  const [time, setTime] = useState(() => splitDateTime(value).time);
  // The last time sent, so leaving the time field unchanged sends nothing.
  const [sentTime, setSentTime] = useState(time);

  function pickDate(next: string) {
    setDate(next);
    const nextTime = next ? time : "";
    setTime(nextTime);
    setSentTime(nextTime);
    onChange({ date: next, time: nextTime });
  }

  const describe = (part: boolean | undefined) =>
    part ? { "aria-invalid": true as const, "aria-describedby": describedBy } : {};

  return (
    <div className="flex gap-2">
      <DatePicker
        id={id}
        label={dateLabel}
        value={date}
        onChange={pickDate}
        disabled={disabled}
        clearable
        className="min-w-0 flex-1"
        {...describe(invalid?.date)}
      />
      <input
        id={`${id}-time`}
        type="time"
        aria-label={timeLabel}
        value={time}
        disabled={disabled || !date}
        onChange={(e) => setTime(e.target.value)}
        onBlur={() => {
          if (time === sentTime) return;
          setSentTime(time);
          onChange({ date, time });
        }}
        className={cn(
          inputClasses,
          "w-28 shrink-0 appearance-none disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-calendar-picker-indicator]:hidden",
        )}
        {...describe(invalid?.time)}
      />
    </div>
  );
}
