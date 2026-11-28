import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveResult } from "@/hooks/use-save-status";
import type { Application, ApplicationChanges } from "@/lib/applications";
import { application, interview } from "@/test/applications";
import { MarkDoneDialog, type MarkDoneAsking } from "./mark-done-dialog";

// The clock is fixed so "the 15th of the shown month" is in the past and after the applied date.
const NOW = new Date(2026, 10, 28, 12);
const REJECT = { status: "done" as const, outcome: "rejected" as const, done_on: "2026-11-28" };

const screenRound = interview("screen", { title: "Recruiter Screen", at: "2026-11-03T15:00:00Z" });
const ahead = interview("ahead", { title: "Technical", at: "2026-12-04T15:00:00Z", completed: false });
const tbd = interview("tbd", { title: "Leadership", at: null, completed: false });
const lumen = application("lumen", { company: "Lumen Bio", interviews: [screenRound, ahead, tbd] });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function open(app: Application = lumen, onConfirm = vi.fn<(changes: ApplicationChanges) => Promise<SaveResult>>(async () => ({ ok: true }))) {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const asking: MarkDoneAsking = { change: REJECT, interviews: [ahead, tbd] };
  render(<MarkDoneDialog app={app} asking={asking} onConfirm={onConfirm} onClose={onClose} />);
  return { user, onConfirm, onClose, dialog: screen.getByRole("dialog", { name: "Did these Interviews happen?" }) };
}

/** Picks the 15th of the shown month in a row's date picker, and types a time when one is given. */
async function pickDate(user: ReturnType<typeof userEvent.setup>, row: HTMLElement, time?: string) {
  await user.click(within(row).getByRole("button", { name: /^Date, / }));
  await user.click(within(screen.getByRole("grid")).getByText("15"));
  if (time) await user.type(within(row).getByLabelText("Time"), time);
}

/** An Interview's row: its list item, named by its title. */
const row = (dialog: HTMLElement, name: string) => within(dialog).getByRole("listitem", { name });

describe("Mark done dialog (BIG-222)", () => {
  it("asks about each Interview by its Round, every row starting on No / Didn't happen, and confirms in one click", async () => {
    const { user, dialog, onConfirm, onClose } = open();
    const technical = within(dialog).getByRole("radiogroup", { name: "Round 2 · Technical" });
    const leadership = within(dialog).getByRole("radiogroup", { name: "Round 3 · Leadership" });
    expect(within(technical).getByRole("radio", { name: "Didn’t happen" })).toBeChecked();
    expect(within(technical).getByRole("radio", { name: "Keep the date" })).not.toBeChecked();
    expect(within(leadership).getByRole("radio", { name: "No" })).toBeChecked();
    await user.click(within(dialog).getByRole("button", { name: "Mark Rejected" }));
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith({
      ...REJECT,
      interviews: [
        { id: "ahead", at: null },
        { id: "tbd", at: null },
      ],
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("keeps the date of an Interview still ahead when asked to", async () => {
    const { user, dialog, onConfirm } = open();
    await user.click(within(dialog).getByRole("radio", { name: "Keep the date" }));
    await user.click(within(dialog).getByRole("button", { name: "Mark Rejected" }));
    expect(onConfirm.mock.calls[0][0].interviews).toEqual([
      { id: "ahead", at: "2026-12-04T15:00:00Z" },
      { id: "tbd", at: null },
    ]);
  });

  it("asks when an Unscheduled Interview happened, and saves that date", async () => {
    const { user, dialog, onConfirm } = open();
    const leadership = row(dialog, "Round 3 · Leadership");
    await user.click(within(leadership).getByRole("radio", { name: "Yes" }));
    await user.click(within(dialog).getByRole("button", { name: "Mark Rejected" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(within(leadership).getByRole("button", { name: /^Date, / })).toHaveAccessibleDescription("Enter when it happened.");
    await pickDate(user, leadership, "10:00");
    await user.click(within(dialog).getByRole("button", { name: "Mark Rejected" }));
    expect(onConfirm.mock.calls[0][0].interviews).toEqual([
      { id: "ahead", at: null },
      { id: "tbd", at: new Date(2026, 10, 15, 10).toISOString() },
    ]);
  });

  it("refuses a date before the Application was applied for", async () => {
    const { user, dialog, onConfirm } = open({ ...lumen, applied_on: "2026-11-20" });
    const leadership = row(dialog, "Round 3 · Leadership");
    await user.click(within(leadership).getByRole("radio", { name: "Yes" }));
    await pickDate(user, leadership, "10:00");
    await user.click(within(dialog).getByRole("button", { name: "Mark Rejected" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(within(leadership).getByRole("button", { name: /^Date, / })).toHaveAccessibleDescription(
      "Enter a date on or after the day you applied.",
    );
  });

  it("keeps a failure in the dialog, beside its button", async () => {
    const { user, dialog, onClose } = open(lumen, vi.fn(async (): Promise<SaveResult> => ({ ok: false, error: "Couldn’t reach Bigfoot’s server. Try again." })));
    await user.click(within(dialog).getByRole("button", { name: "Mark Rejected" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Couldn’t reach Bigfoot’s server. Try again.");
    expect(onClose).not.toHaveBeenCalled();
  });
});
