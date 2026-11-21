import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal, SidePanel } from "./modal";

// What Modal and SidePanel do themselves. The focus trap and focus returning to the opener come
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

describe("SidePanel", () => {
  function renderPanel(props: { open?: boolean; onBack?: () => void } = {}) {
    const onClose = vi.fn();
    render(
      <>
        <button type="button">Page behind</button>
        <SidePanel open onClose={onClose} title="Birch" subtitle="Engineer" {...props}>
          <button type="button">Save</button>
        </SidePanel>
      </>,
    );
    return { onClose };
  }

  it("stays closed, without its content, until opened", () => {
    renderPanel({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("opens as a dialog named by its title and described by its subtitle", () => {
    renderPanel();
    expect(screen.getByRole("dialog", { name: "Birch", description: "Engineer" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Back to list" })).not.toBeInTheDocument();
  });

  it("makes the page behind inert while open, as a native modal dialog does, and live again after", async () => {
    const onClose = vi.fn();
    const page = <button type="button">Page behind</button>;
    // The page behind is the container React Testing Library renders into.
    const { container, rerender } = render(
      <>
        {page}
        <SidePanel open onClose={onClose} title="Birch">
          <button type="button">Save</button>
        </SidePanel>
      </>,
    );
    await waitFor(() => expect(container).toHaveAttribute("inert"));
    rerender(
      <>
        {page}
        <SidePanel open={false} onClose={onClose} title="Birch">
          <button type="button">Save</button>
        </SidePanel>
      </>,
    );
    expect(container).not.toHaveAttribute("inert");
  });

  it("asks to close from its Close button and on Escape", async () => {
    const { onClose } = renderPanel();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("stays open on a click on the page behind, so a stray click can't lose edits", () => {
    const { onClose } = renderPanel();
    // Radix makes the page behind ignore the pointer, so press it directly, as a stray click would.
    fireEvent.pointerDown(screen.getByText("Page behind"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("offers Back to list only when there is a list to go back to", async () => {
    const onBack = vi.fn();
    renderPanel({ onBack });
    await userEvent.click(screen.getByRole("button", { name: "Back to list" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

describe("focus after a dialog closes", () => {
  /** A panel opened from a button, whose Delete replaces it with a confirmation, as on the dashboard. */
  function Opener() {
    const [view, setView] = useState<"none" | "panel" | "confirm">("none");
    return (
      <>
        <button type="button" onClick={() => setView("panel")}>
          Open Birch
        </button>
        <SidePanel open={view === "panel"} onClose={() => setView("none")} title="Birch">
          <button type="button" onClick={() => setView("confirm")}>
            Delete application
          </button>
        </SidePanel>
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
