import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { application, interview } from "@/test/applications";
import { FilteredApplications } from "./filtered-applications";

vi.mock("next/navigation", () => import("@/test/navigation"));

afterEach(() => window.history.replaceState(null, "", "/applications"));

// jsdom draws both the wide-screen toggle group and the phone's menu button (CSS hides one), so
// the tests reach the toggle group through its "Progress" label and the menu through its button.

const booked = interview("booked", { at: "2026-12-02T15:00:00Z", completed: false });
const scheduled = application("scheduled", { company: "Kestrel", is_waiting: false, waiting_since: null, interviews: [booked] });
const zeta = application("zeta", { company: "Zeta", location: "in_office", waiting_since: "2026-11-10" });
const alpha = application("alpha", { company: "Alpha", location: "remote", waiting_since: "2026-11-20" });
const offer = application("offer", { company: "Cobalt", status: "done", outcome: "offer", is_waiting: false });
const rejected = application("rejected", { company: "Umbrella", status: "done", outcome: "rejected", is_waiting: false });
const all = [scheduled, zeta, alpha, offer, rejected];

const companies = () =>
  screen.queryAllByRole("link", { name: /^Open / }).map((link) => link.textContent?.replace(/^Open /, "").split(",")[0]);
const toggleGroup = () => screen.getByRole("radiogroup", { name: "Progress" });
const status = () => screen.getAllByText(/^Showing /)[0];

function setUp(apps = all) {
  const user = userEvent.setup();
  render(<FilteredApplications applications={apps} />);
  return user;
}

describe("the Applications page's list (BIG-252)", () => {
  it("shows In Progress Applications and Offers in a card named All Applications, and points to the Done filter", () => {
    setUp();
    expect(screen.getByRole("region", { name: "All Applications" })).toBeInTheDocument();
    expect(companies()).toEqual(["Kestrel", "Zeta", "Alpha", "Cobalt"]);
    expect(screen.getByText("1 Done Application isn’t shown. Pick Done to see it.")).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Show done" })).not.toBeInTheDocument();
  });

  it("offers All and each Progress value with Applications, with its count, leaving out those at zero", () => {
    setUp();
    const items = within(toggleGroup()).getAllByRole("radio");
    expect(items.map((item) => item.textContent)).toEqual(["All 4", "Interview scheduled 1", "Waiting 2", "Offer 1", "Done 1"]);
    expect(within(toggleGroup()).getByRole("radio", { name: "All 4" })).toBeChecked();
  });

  it("filters to a Progress value, in the URL, with how many show and Clear filter", async () => {
    const user = setUp();
    await user.click(within(toggleGroup()).getByRole("radio", { name: "Waiting 2" }));
    expect(companies()).toEqual(["Zeta", "Alpha"]);
    expect(window.location.search).toBe("?progress=waiting");
    expect(screen.getByRole("region", { name: "Waiting Applications" })).toBeInTheDocument();
    expect(status()).toHaveTextContent("Showing 2 of 4");
    expect(status()).toHaveAttribute("aria-live", "polite");

    await user.click(screen.getAllByRole("button", { name: "Clear filter" })[0]);
    expect(window.location.search).toBe("");
    expect(companies()).toEqual(["Kestrel", "Zeta", "Alpha", "Cobalt"]);
    expect(screen.queryByText(/^Showing /)).not.toBeInTheDocument();
  });

  it("says how many Done Applications show, without the line pointing to them", async () => {
    const user = setUp();
    await user.click(within(toggleGroup()).getByRole("radio", { name: "Done 1" }));
    expect(companies()).toEqual(["Umbrella"]);
    expect(status()).toHaveTextContent("Showing 1 Done");
    expect(screen.queryByText(/isn’t shown/)).not.toBeInTheDocument();
  });

  it("adds a history entry per filter, so Back and Forward step through them", async () => {
    const user = setUp();
    const before = window.history.length;
    await user.click(within(toggleGroup()).getByRole("radio", { name: "Waiting 2" }));
    await user.click(within(toggleGroup()).getByRole("radio", { name: "Offer 1" }));
    expect(window.history.length).toBe(before + 2);
    expect(companies()).toEqual(["Cobalt"]);

    // Back, as the browser does it: the URL changes, then popstate. (jsdom doesn't fire it for history.back().)
    act(() => {
      window.history.replaceState(null, "", "/applications?progress=waiting");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(companies()).toEqual(["Zeta", "Alpha"]);
  });

  it("opens filtered and sorted as its URL says, and reads an unknown filter as All", () => {
    window.history.replaceState(null, "", "/applications?progress=waiting&sort=application");
    const { unmount } = render(<FilteredApplications applications={all} />);
    expect(companies()).toEqual(["Alpha", "Zeta"]);
    expect(screen.getByRole("columnheader", { name: "Application" })).toHaveAttribute("aria-sort", "ascending");
    unmount();

    window.history.replaceState(null, "", "/applications?progress=pending");
    render(<FilteredApplications applications={all} />);
    expect(companies()).toEqual(["Kestrel", "Zeta", "Alpha", "Cobalt"]);
  });

  it("keeps the filter when sorting, and the sort when filtering", async () => {
    const user = setUp();
    await user.click(within(toggleGroup()).getByRole("radio", { name: "Waiting 2" }));
    await user.click(screen.getByRole("button", { name: "Application" }));
    expect(window.location.search).toBe("?progress=waiting&sort=application");
    expect(companies()).toEqual(["Alpha", "Zeta"]);

    await user.click(within(toggleGroup()).getByRole("radio", { name: "All 4" }));
    expect(window.location.search).toBe("?sort=application");
    expect(companies()).toEqual(["Alpha", "Cobalt", "Kestrel", "Zeta"]);
  });

  it("filters from the menu button on a phone, which names the current value", async () => {
    const user = setUp();
    await user.click(screen.getByRole("button", { name: "Filter: All" }));
    const menu = screen.getByRole("menu", { name: "Filter by Progress" });
    expect(within(menu).getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
      "All4",
      "Interview scheduled1",
      "Waiting2",
      "Offer1",
      "Done1",
    ]);

    await user.click(within(menu).getByRole("menuitemradio", { name: /^Waiting/ }));
    expect(window.location.search).toBe("?progress=waiting");
    expect(screen.getByRole("button", { name: "Filter: Waiting" })).toBeInTheDocument();
  });

  it("has Bigfoot and Clear filter for a filter that matches nothing, as a stale link can pick", async () => {
    window.history.replaceState(null, "", "/applications?progress=unscheduled");
    const user = setUp();
    expect(screen.getByRole("heading", { name: "No Next round · date TBD Applications right now" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    const clear = screen.getAllByRole("button", { name: "Clear filter" });
    await user.click(clear[clear.length - 1]);
    expect(window.location.search).toBe("");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("welcomes a job seeker with no Applications, with no filter, and offers the first one", () => {
    setUp([]);
    expect(screen.getByRole("heading", { name: "Your search starts here" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first Application" })).toHaveAttribute("href", "/applications/new");
    expect(screen.queryByRole("radiogroup", { name: "Progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Filter/ })).not.toBeInTheDocument();
  });
});
