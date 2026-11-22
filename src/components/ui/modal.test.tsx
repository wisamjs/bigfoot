import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

// What Modal does itself. The focus trap and focus returning to the opener come
// from Radix Dialog; `npm run a11y` checks them in Chrome.

function renderModal(open: boolean, onClose = vi.fn()) {
  const view = render(
    <Modal open={open} onClose={onClose} title="Delete application?">
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

  it("opens as a dialog named by its title", () => {
    renderModal(true);
    expect(screen.getByRole("dialog", { name: "Delete application?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("asks to close from its Close button", async () => {
    const { onClose } = renderModal(true);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("asks to close on Escape", async () => {
    const { onClose } = renderModal(true);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes and drops its content when no longer open", () => {
    const { rerender } = renderModal(true);
    rerender(
      <Modal open={false} onClose={() => {}} title="Delete application?">
        <button type="button">Save</button>
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});

describe("focus after a dialog closes", () => {
  /** A dialog opened from a button, whose Delete replaces it with a confirmation. */
  function Opener() {
    const [view, setView] = useState<"none" | "first" | "confirm">("none");
    return (
      <>
        <button type="button" onClick={() => setView("first")}>
          Open Birch
        </button>
        <Modal open={view === "first"} onClose={() => setView("none")} title="Birch">
          <button type="button" onClick={() => setView("confirm")}>
            Delete application
          </button>
        </Modal>
        <Modal open={view === "confirm"} onClose={() => setView("none")} title="Delete application?">
          <p>This can’t be undone.</p>
        </Modal>
      </>
    );
  }

  it("returns to the control that opened it", async () => {
    render(<Opener />);
    await userEvent.click(screen.getByRole("button", { name: "Open Birch" }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Birch" })).toHaveFocus());
  });

  it("returns to the first opener when a dialog was replaced by another", async () => {
    render(<Opener />);
    await userEvent.click(screen.getByRole("button", { name: "Open Birch" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete application" }));
    expect(screen.getByRole("dialog", { name: "Delete application?" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Birch" })).toHaveFocus());
  });
});
