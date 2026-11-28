import { describe, expect, it } from "vitest";
import { application, interview } from "@/test/applications";
import {
  parseApplicationSort,
  sortApplications,
  type Application,
  type ApplicationSort,
  type ProgressFilter,
} from "./applications";

const done = (n: number) => interview(`done-${n}`, { at: `2026-10-0${n}T15:00:00Z` });
const upcoming = (n: number, at: string) => interview(`next-${n}`, { at, completed: false });

/** Booked: its next Interview is Round 3, on Dec 10. */
const round3 = application("round3", {
  company: "Round Three",
  is_waiting: false,
  waiting_since: null,
  interviews: [done(1), done(2), upcoming(3, "2026-12-10T15:00:00Z")],
});
/** Booked: Round 1, but sooner, on Dec 2. */
const round1 = application("round1", {
  company: "Round One",
  is_waiting: false,
  waiting_since: null,
  interviews: [upcoming(1, "2026-12-02T15:00:00Z")],
});
/** Booked: also Round 3, but sooner than round3, on Dec 5. */
const round3Sooner = application("round3-sooner", {
  company: "Another Round Three",
  is_waiting: false,
  waiting_since: null,
  interviews: [done(1), done(2), upcoming(3, "2026-12-05T15:00:00Z")],
});
/** Waiting after two Interviews, since Oct 2. */
const waitingTwo = application("waiting-two", {
  company: "Éclair",
  location: "remote",
  waiting_since: "2026-10-02T15:00:00Z",
  interviews: [done(1), done(2)],
});
/** Waiting with no Interviews, since applying on Sep 20: the longest wait. */
const waitingNone = application("waiting-none", { company: "acme", location: "hybrid", office_days: 3, waiting_since: "2026-09-20" });
/** Waiting with no Interviews, since Nov 1. */
const waitingNew = application("waiting-new", { company: "Birch", location: "in_office", waiting_since: "2026-11-01" });
const offer = application("offer", { company: "Zeta", status: "done", outcome: "offer", is_waiting: false, waiting_since: null });
const rejected = application("rejected", {
  company: "Aardvark",
  location: "remote",
  status: "done",
  outcome: "rejected",
  is_waiting: false,
  waiting_since: null,
});

const all = [rejected, offer, waitingNew, waitingNone, waitingTwo, round1, round3, round3Sooner];

function order(sort: ApplicationSort, apps: Application[] = all, shown: ProgressFilter = "all") {
  return sortApplications(apps, { sort, shown }).map((row) => row.application.id);
}

describe("sortApplications", () => {
  it("sorts by Progress by default: the highest Round booked first, then the most Interviews behind a Waiting one", () => {
    expect(sortApplications(all).map((row) => row.application.id)).toEqual([
      "round3-sooner", // Round 3, sooner than round3
      "round3",
      "round1",
      "waiting-two", // two Interviews completed
      "waiting-none", // none, the longest wait
      "waiting-new",
      "offer",
    ]);
  });

  it("sorts by Application: company A–Z, then role, ignoring case and accents", () => {
    const birchManager = application("birch-manager", { company: "birch", title: "Manager" });
    expect(order("application", [...all, birchManager])).toEqual([
      "waiting-none", // acme
      "round3-sooner", // Another Round Three
      "waiting-new", // Birch · Engineer
      "birch-manager", // birch · Manager
      "waiting-two", // Éclair sorts with E
      "round1",
      "round3",
      "offer",
    ]);
  });

  it("sorts by Next: the soonest Interview first, then the longest wait, then Offers", () => {
    expect(order("next")).toEqual([
      "round1",
      "round3-sooner",
      "round3",
      "waiting-none",
      "waiting-two",
      "waiting-new",
      "offer",
    ]);
  });

  it("sorts by Location A–Z, ties by company, with no Location last", () => {
    expect(order("location")).toEqual([
      "waiting-none", // Hybrid - 3x a Week
      "waiting-new", // In-Office
      "waiting-two", // Remote
      "round3-sooner", // no Location, by company
      "round1",
      "round3",
      "offer", // Zeta
    ]);
  });

  it("sorts the Done Applications in company order rather than arrival order", () => {
    const withdrawn = application("withdrawn", { company: "Yew", status: "done", outcome: "withdrawn", is_waiting: false, waiting_since: null });
    const filled = application("filled", { company: "Maple", status: "done", outcome: "position_filled", is_waiting: false, waiting_since: null });
    const apps = [withdrawn, filled, rejected, waitingNew];
    for (const sort of ["progress", "next"] as const) {
      expect(order(sort, apps, "done")).toEqual(["rejected", "filled", "withdrawn"]);
    }
  });

  it("shows In Progress Applications and Offers by default, leaving out the other Done ones", () => {
    for (const sort of ["progress", "application", "next", "location"] as const) {
      expect(order(sort, all, "all")).not.toContain("rejected");
      expect(order(sort, all, "all")).toContain("offer");
    }
  });

  it("shows only the Progress value a filter picks, in the sort's order (BIG-252)", () => {
    expect(order("progress", all, "waiting")).toEqual(["waiting-two", "waiting-none", "waiting-new"]);
    expect(order("application", all, "waiting")).toEqual(["waiting-none", "waiting-new", "waiting-two"]);
    expect(order("progress", all, "done")).toEqual(["rejected"]);
    expect(order("progress", all, "offer")).toEqual(["offer"]);
    expect(order("progress", all, "unscheduled")).toEqual([]);
  });

  it("puts Applications whose Interviews ahead are all Unscheduled after the booked ones and before Waiting", () => {
    const tbd = (n: number) => interview(`tbd-${n}`, { at: null, completed: false });
    /** Next round · date TBD: Round 3 awaits a date. */
    const tbdRound3 = application("tbd-round3", {
      company: "TBD Three",
      is_waiting: false,
      waiting_since: null,
      interviews: [done(1), done(2), tbd(3)],
    });
    /** Next round · date TBD: Round 1 awaits a date. */
    const tbdRound1 = application("tbd-round1", { company: "TBD One", is_waiting: false, waiting_since: null, interviews: [tbd(1)] });
    /** Booked: Round 1 on Dec 2, and an Unscheduled Round 2 after it, so Interview scheduled. */
    const bookedThenTbd = application("booked-then-tbd", {
      company: "Booked",
      is_waiting: false,
      waiting_since: null,
      interviews: [upcoming(1, "2026-12-02T15:00:00Z"), tbd(2)],
    });
    const apps = [waitingTwo, tbdRound1, tbdRound3, bookedThenTbd, round3];
    expect(order("progress", apps)).toEqual(["round3", "booked-then-tbd", "tbd-round3", "tbd-round1", "waiting-two"]);
    expect(order("next", apps)).toEqual(["booked-then-tbd", "round3", "tbd-round1", "tbd-round3", "waiting-two"]);
    expect(sortApplications([tbdRound1])[0].group).toEqual({ id: "unscheduled", label: "Next round · date TBD" });
  });

  it("gives each row the group its Progress shows", () => {
    const groups = sortApplications(all).map((row) => row.group.label);
    expect(new Set(groups)).toEqual(new Set(["Interview scheduled", "Waiting", "Offer"]));
    expect(sortApplications(all, { shown: "done" })[0].group).toEqual({ id: "done", label: "Done" });
    expect(sortApplications([round1])[0].group).toEqual({ id: "scheduled", label: "Interview scheduled" });
  });
});

describe("parseApplicationSort", () => {
  it("reads a sort from the URL, and falls back to Progress", () => {
    expect(parseApplicationSort("location")).toBe("location");
    expect(parseApplicationSort(null)).toBe("progress");
    expect(parseApplicationSort("nonsense")).toBe("progress");
  });
});
