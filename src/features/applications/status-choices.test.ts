import { describe, expect, it } from "vitest";
import { OUTCOME_OPTIONS, OUTCOMES } from "@/lib/applications";
import { statusChoices } from "./status-choices";

const inProgress = { status: "in_progress" as const, outcome: null, applied_on: "2026-11-02" };
const rejected = { status: "done" as const, outcome: "rejected" as const, applied_on: "2026-11-02" };

describe("statusChoices", () => {
  it("offers each Outcome for an In Progress Application, dated today, and no Reopen", () => {
    const choices = statusChoices(inProgress, "2026-11-25");
    expect(choices.map((c) => c.label)).toEqual(OUTCOMES.map((o) => `Mark ${OUTCOME_OPTIONS[o].label}`));
    expect(choices[0].label).toBe("Mark Offer");
    expect(choices[1].change).toEqual({ status: "done", outcome: "rejected", done_on: "2026-11-25" });
    expect(choices.some((c) => c.separated)).toBe(false);
  });

  it("dates an Application applied for today, but not one applied for after today", () => {
    expect(statusChoices({ ...inProgress, applied_on: "2026-11-25" }, "2026-11-25")[0].change.done_on).toBe("2026-11-25");
    expect(statusChoices({ ...inProgress, applied_on: "2026-11-26" }, "2026-11-25")[0].change.done_on).toBeNull();
  });

  it("leaves out a Done Application's own Outcome, keeps its Done date, and offers Reopen after a separator", () => {
    const choices = statusChoices(rejected, "2026-11-25");
    expect(choices.map((c) => c.label)).not.toContain("Mark Rejected");
    expect(choices[0].change).toEqual({ status: "done", outcome: "offer" });
    expect(choices.at(-1)).toEqual({
      label: "Reopen",
      change: { status: "in_progress", outcome: null, done_on: null, outcome_note: null },
      separated: true,
    });
  });
});
