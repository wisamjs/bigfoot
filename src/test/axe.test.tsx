// eslint-disable-next-line testing-library/no-manual-cleanup -- setup.ts runs cleanup after axe; this test must clear the screen first so setup.ts doesn't fail it for the violations it set out to find.
import { cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axeViolations } from "./setup";

// setup.ts fails every component test whose output breaks an axe rule. These make sure it
// actually would, and that page-only rules don't fail a lone component.
describe("axe in component tests", () => {
  it("finds a button with no name and an image with no alt", async () => {
    // As HTML, so lint doesn't reject the markup this test means to be broken.
    // eslint-disable-next-line testing-library/no-node-access -- writes broken markup into a rendered element; there is nothing to query yet.
    render(<div />).container.firstElementChild!.innerHTML = '<button type="button"></button><img src="/x.png">';
    const found = await axeViolations();
    cleanup();
    expect(found.some((v) => v.startsWith("button-name"))).toBe(true);
    expect(found.some((v) => v.startsWith("image-alt"))).toBe(true);
  });

  it("passes a lone component with no landmarks or h1", async () => {
    render(
      <button type="button" className="text-heading">
        Save
      </button>,
    );
    expect(await axeViolations()).toEqual([]);
  });
});
