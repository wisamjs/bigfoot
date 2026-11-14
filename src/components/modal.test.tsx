import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

// What Modal does itself. The focus trap, Escape and returning focus come from the browser's
// modal <dialog>, which happy-dom doesn't implement; `npm run a11y` checks them in Chrome.

function renderModal(open: boolean, onClose = vi.fn()) {
  const view = render(
    <Modal open={open} onClose={onClose} title="Edit application">
      <button type="button">Save</button>
    </Modal>,
  );
  return { ...view, onClose };
}

describe("Modal", () => {
  it("stays closed, without its content, until opened", () => {
    renderModal(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("opens as a modal dialog named by its title", () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, "showModal");
    renderModal(true);
    expect(showModal).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "Edit application" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("asks to close from its Close button", async () => {
    const { onClose } = renderModal(true);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("asks to close when the browser closes the dialog, as it does on Escape", () => {
    const { onClose } = renderModal(true);
    (screen.getByRole("dialog") as HTMLDialogElement).close();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes and drops its content when no longer open", () => {
    const { rerender } = renderModal(true);
    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    rerender(
      <Modal open={false} onClose={() => {}} title="Edit application">
        <button type="button">Save</button>
      </Modal>,
    );
    expect(dialog.open).toBe(false);
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
