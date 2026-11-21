import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("is a brand, base-size button that never submits a form by accident", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("btn", "btn-brand", "px-4", "text-sm");
  });

  it("takes a variant, a size and extra classes", () => {
    render(
      <Button type="submit" variant="danger" size="sm" className="w-full">
        Delete
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("btn", "text-fg-danger", "px-3", "w-full");
  });

  it("styles its child instead with asChild, such as a link", () => {
    render(
      <Button asChild variant="tertiary">
        <a href="/sign-in">Sign in</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toHaveClass("btn", "btn-tertiary");
    expect(link).not.toHaveAttribute("type");
  });
});
