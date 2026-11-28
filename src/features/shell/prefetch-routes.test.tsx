import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrefetchRoutes } from "./prefetch-routes";

const prefetch = vi.fn();
// One router for the page's life, as Next.js gives.
const router = { prefetch };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => prefetch.mockReset());

/** The hrefs prefetched so far, in order. */
const prefetched = () => prefetch.mock.calls.map(([href]) => href);
/** Next.js saying the prefetch of `href` went stale, as after a Server Action expires its data. */
function invalidate(href: string) {
  const [, options] = prefetch.mock.calls.findLast(([h]) => h === href)!;
  options.onInvalidate();
}

describe("PrefetchRoutes (BIG-205)", () => {
  it("prefetches each page in the order given, drawing nothing", () => {
    const { container } = render(<PrefetchRoutes hrefs={["/a/r3", "/a/r2", "/a/r1"]} />);
    expect(prefetched()).toEqual(["/a/r3", "/a/r2", "/a/r1"]);
    expect(container).toBeEmptyDOMElement();
  });

  it("prefetches a page again once its prefetch goes stale, as after a save", () => {
    render(<PrefetchRoutes hrefs={["/a/r2", "/a/r1"]} />);
    invalidate("/a/r1");
    expect(prefetched()).toEqual(["/a/r2", "/a/r1", "/a/r1"]);
  });

  it("doesn't prefetch again when the page renders the same list anew", () => {
    const { rerender } = render(<PrefetchRoutes hrefs={["/a/r1"]} />);
    rerender(<PrefetchRoutes hrefs={["/a/r1"]} />);
    expect(prefetched()).toEqual(["/a/r1"]);
  });

  it("prefetches the new list when it changes, as after an Interview is added", () => {
    const { rerender } = render(<PrefetchRoutes hrefs={["/a/r1"]} />);
    rerender(<PrefetchRoutes hrefs={["/a/r2", "/a/r1"]} />);
    expect(prefetched()).toEqual(["/a/r1", "/a/r2", "/a/r1"]);
  });

  it("stops once the page is left, even when a prefetch then goes stale", () => {
    const { unmount } = render(<PrefetchRoutes hrefs={["/a/r1"]} />);
    unmount();
    invalidate("/a/r1");
    expect(prefetched()).toEqual(["/a/r1"]);
  });

  it("prefetches nothing for an empty list", () => {
    render(<PrefetchRoutes hrefs={[]} />);
    expect(prefetch).not.toHaveBeenCalled();
  });
});
