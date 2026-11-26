import { describe, expect, it } from "vitest";
import { expiry, followingText, lastOpened, shareLinkPath, shortDate, suggestPasscode } from "./share-links";

const NOW = new Date(2026, 10, 25, 14, 0);
const time = (date: Date) => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
const local = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);

describe("expiry", () => {
  it("counts the calendar days left", () => {
    expect(expiry({ expires_at: local(28, 9).toISOString(), expired: false }, NOW)).toEqual({
      text: "Expires in 3 days",
      tone: "normal",
    });
    expect(expiry({ expires_at: local(26, 1).toISOString(), expired: false }, NOW)).toEqual({
      text: "Expires tomorrow",
      tone: "normal",
    });
  });

  it("gives the time on the link's last day, as a warning", () => {
    const at = local(25, 18);
    expect(expiry({ expires_at: at.toISOString(), expired: false }, NOW)).toEqual({
      text: `Expires today, ${time(at)}`,
      tone: "soon",
    });
  });

  it("says when an expired link stopped, whether the API or the clock says so", () => {
    const at = local(23, 9);
    const expired = { text: `Expired ${shortDate(at)}`, tone: "expired" };
    expect(expiry({ expires_at: at.toISOString(), expired: true }, NOW)).toEqual(expired);
    expect(expiry({ expires_at: at.toISOString(), expired: false }, NOW)).toEqual(expired);
  });
});

describe("lastOpened", () => {
  it("says when a Viewer last opened the link", () => {
    const today = local(25, 8, 12);
    const yesterday = local(24, 21, 5);
    const earlier = local(20, 9, 30);
    expect(lastOpened({ last_opened_at: today.toISOString() }, NOW)).toBe(`Viewed today, ${time(today)}`);
    expect(lastOpened({ last_opened_at: yesterday.toISOString() }, NOW)).toBe(`Viewed yesterday, ${time(yesterday)}`);
    expect(lastOpened({ last_opened_at: earlier.toISOString() }, NOW)).toBe(`Viewed ${shortDate(earlier)}, ${time(earlier)}`);
  });

  it("says when no one has", () => {
    expect(lastOpened({ last_opened_at: null }, NOW)).toBe("Not opened yet");
  });
});

describe("followingText", () => {
  it("counts the links that still open", () => {
    expect(followingText([{ expired: false }, { expired: false }, { expired: true }])).toMatch(/^2 people can follow along\./);
    expect(followingText([{ expired: false }])).toMatch(/^1 person can follow along\./);
    expect(followingText([{ expired: true }])).toMatch(/no one can follow along right now/);
  });
});

describe("suggestPasscode", () => {
  it("is three different words and a two-digit number", () => {
    for (let n = 0; n < 50; n++) expect(suggestPasscode()).toMatch(/^([a-z]+)-(?!\1-)([a-z]+)-(?!\1-|\2-)[a-z]+-\d\d$/);
  });

  it("draws again when a word repeats", () => {
    const draws = [0, 0, 1, 1, 2, 5];
    expect(suggestPasscode(() => draws.shift() ?? 0)).toBe("maple-river-otter-15");
  });
});

it("builds the path a Viewer opens", () => {
  expect(shareLinkPath("k7Qm2x9PaB")).toBe("/journey/k7Qm2x9PaB");
});
