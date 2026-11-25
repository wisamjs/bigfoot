import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SAVE_THREW, SAVED_FOR_MS, useSaveStatus, type SaveResult } from "@/hooks/use-save-status";
import { SaveStatus } from "./save-status";

/** A save that stays in flight until the test settles it. */
function deferred() {
  let settle!: (result: SaveResult) => void;
  const promise = new Promise<SaveResult>((resolve) => (settle = resolve));
  return { promise, settle };
}

describe("useSaveStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is saving while the save runs, then saved, then back to nothing", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSaveStatus());
    const save = deferred();
    let run!: Promise<SaveResult>;
    act(() => {
      run = result.current.run(() => save.promise);
    });
    expect(result.current.status).toEqual({ phase: "saving" });
    expect(result.current.saving).toBe(true);

    await act(async () => {
      save.settle({ ok: true });
      await run;
    });
    expect(result.current.status.phase).toBe("saved");

    act(() => vi.advanceTimersByTime(SAVED_FOR_MS - 1));
    expect(result.current.status.phase).toBe("saved");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.status).toEqual({ phase: "idle" });
  });

  it("restarts the time Saved stays when the field is saved again", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSaveStatus());
    await act(() => result.current.run(async () => ({ ok: true })));
    const first = result.current.status;
    act(() => vi.advanceTimersByTime(SAVED_FOR_MS - 500));
    await act(() => result.current.run(async () => ({ ok: true })));
    expect(result.current.status).not.toEqual(first);
    act(() => vi.advanceTimersByTime(SAVED_FOR_MS - 1));
    expect(result.current.status.phase).toBe("saved");
  });

  it("keeps the error until the next save, and Retry sends the same save again", async () => {
    const { result } = renderHook(() => useSaveStatus());
    const save = vi.fn<() => Promise<SaveResult>>().mockResolvedValueOnce({ ok: false, error: "Nope" });
    save.mockResolvedValueOnce({ ok: true });

    await act(() => result.current.run(save));
    expect(result.current.status).toEqual({ phase: "failed", error: "Nope" });

    await act(() => result.current.retry());
    expect(save).toHaveBeenCalledTimes(2);
    expect(result.current.status.phase).toBe("saved");
  });

  it("says to check the connection when a save throws", async () => {
    const { result } = renderHook(() => useSaveStatus());
    await act(() => result.current.run(() => Promise.reject(new Error("Failed to fetch"))));
    expect(result.current.status).toEqual({ phase: "failed", error: SAVE_THREW });
  });

  it("shows only the latest save's result", async () => {
    const { result } = renderHook(() => useSaveStatus());
    const first = deferred();
    let firstRun!: Promise<SaveResult>;
    act(() => {
      firstRun = result.current.run(() => first.promise);
    });
    await act(() => result.current.run(async () => ({ ok: true })));
    await act(async () => {
      first.settle({ ok: false, error: "Stale" });
      await firstRun;
    });
    expect(result.current.status.phase).toBe("saved");
  });
});

describe("SaveStatus", () => {
  it("shows nothing, but keeps its live region, while there is nothing to say", () => {
    render(<SaveStatus status={{ phase: "idle" }} label="Status" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says what is saving and when it's saved, naming it for screen readers", () => {
    const { rerender } = render(<SaveStatus status={{ phase: "saving" }} label="Interview 2 title" />);
    expect(screen.getByRole("status")).toHaveTextContent("Interview 2 title: Saving…");
    rerender(<SaveStatus status={{ phase: "saved", run: 1 }} label="Interview 2 title" />);
    expect(screen.getByRole("status")).toHaveTextContent("Interview 2 title: Saved");
  });

  it("takes its own words, such as Adding… and Added", () => {
    const { rerender } = render(
      <SaveStatus status={{ phase: "saving" }} label="New Interview" savingText="Adding…" savedText="Added" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Adding…");
    rerender(<SaveStatus status={{ phase: "saved", run: 1 }} label="New Interview" savingText="Adding…" savedText="Added" />);
    expect(screen.getByRole("status")).toHaveTextContent("Added");
  });

  it("shows the error as an alert, with a Retry", async () => {
    const onRetry = vi.fn();
    render(<SaveStatus status={{ phase: "failed", error: "Nope" }} label="Details" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Details: Nope");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry, Details" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
