import { describe, expect, it } from "vitest";
import { application, interview } from "@/test/applications";
import { prefetchHrefs } from "./routes";

describe("prefetchHrefs (BIG-205)", () => {
  const app = application("a1", {
    interviews: [
      interview("r1", { at: "2026-11-02T15:00:00Z" }),
      interview("r3", { at: null }),
      interview("r2", { at: "2026-11-09T15:00:00Z" }),
    ],
  });

  it("lists an Application page's Interview pages from the latest Round to Round 1", () => {
    expect(prefetchHrefs(app)).toEqual([
      "/applications/a1/interviews/r3",
      "/applications/a1/interviews/r2",
      "/applications/a1/interviews/r1",
    ]);
  });

  it("from an Interview page, leaves it out and ends with the Application page it goes back to", () => {
    expect(prefetchHrefs(app, "r2")).toEqual(["/applications/a1/interviews/r3", "/applications/a1/interviews/r1", "/applications/a1"]);
  });

  it("from an Application with no Interviews, lists nothing", () => {
    expect(prefetchHrefs(application("a2", { interviews: [] }))).toEqual([]);
  });
});
