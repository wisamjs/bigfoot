import { cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axeViolations } from "./setup";

// setup.ts fails every component test whose output breaks an axe rule. These make sure it
// actually would, and that page-only rules don't fail a lone component.
describe("axe in component tests", () => {
  it("finds a button with no name and an image with no alt", async () => {
    // As HTML, so lint doesn't reject the markup this test means to be broken.
    render(<div />).container.firstElementChild!.innerHTML = '<button type="button"></button><img src="/x.png">';
    const found = await axeViolations();
    cleanup(); // Don't let setup.ts fail this test for the violations it set out to find.
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
