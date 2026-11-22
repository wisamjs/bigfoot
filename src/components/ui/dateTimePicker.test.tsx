import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DatePicker } from "@/components/ui/datePicker";
import { DateTimePicker } from "@/components/ui/dateTimePicker";

function renderDateTime(value: string) {
  const onChange = vi.fn();
  render(<DateTimePicker id="at" dateLabel="Date" timeLabel="Time" value={value} onChange={onChange} />);
  return { user: userEvent.setup(), onChange };
}

describe("DatePicker", () => {
  it("names itself with its label and the date it shows, and picks a day from the calendar", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DatePicker id="applied" label="Applied" value="2026-11-07" onChange={onChange} />);
    const button = screen.getByRole("button", { name: /^Applied, / });

    await user.click(button);
    await user.click(within(screen.getByRole("grid")).getByText("20"));
    expect(onChange).toHaveBeenCalledWith("2026-11-20");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("keeps a date that can't be blank when its day is clicked again", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DatePicker id="applied" label="Applied" value="2026-11-07" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /^Applied/ }));
    await user.click(within(screen.getByRole("grid")).getByText("7"));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("shows its placeholder with no date", () => {
    render(<DatePicker id="d" label="Date" value="" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Date, Pick a date" })).toHaveTextContent("Pick a date");
  });
});

describe("DateTimePicker", () => {
  it("sends a new time when the time field is left, and nothing when it didn't change", async () => {
    const { user, onChange } = renderDateTime("2026-11-07T10:30");
    const time = screen.getByLabelText("Time");
    await user.click(time);
    await user.tab();
    expect(onChange).not.toHaveBeenCalled();

    await user.clear(time);
    await user.type(time, "14:15");
    await user.tab();
    expect(onChange).toHaveBeenCalledWith({ date: "2026-11-07", time: "14:15" });
  });

  it("keeps the time when the date changes, and clears both with Clear", async () => {
    const { user, onChange } = renderDateTime("2026-11-07T10:30");
    await user.click(screen.getByRole("button", { name: /^Date/ }));
    await user.click(within(screen.getByRole("grid")).getByText("20"));
    expect(onChange).toHaveBeenLastCalledWith({ date: "2026-11-20", time: "10:30" });

    await user.click(screen.getByRole("button", { name: /^Date/ }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith({ date: "", time: "" });
    expect(screen.getByLabelText("Time")).toHaveValue("");
    expect(screen.getByLabelText("Time")).toBeDisabled();
  });

  it("assumes no time: a date picked first leaves the time empty, ready to type", async () => {
    const { user, onChange } = renderDateTime("");
    expect(screen.getByLabelText("Time")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /^Date/ }));
    await user.click(within(screen.getByRole("grid")).getByText("15"));
    expect(onChange).toHaveBeenLastCalledWith({ date: expect.stringMatching(/-15$/), time: "" });
    expect(screen.getByLabelText("Time")).toHaveValue("");
    expect(screen.getByLabelText("Time")).toBeEnabled();
  });

  it("marks only the part that needs fixing invalid", () => {
    render(
      <DateTimePicker
        id="at"
        dateLabel="Date"
        timeLabel="Time"
        value="2026-11-07T"
        onChange={vi.fn()}
        invalid={{ time: true }}
        aria-describedby="at-error"
      />,
    );
    expect(screen.getByLabelText("Time")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Time")).toHaveAttribute("aria-describedby", "at-error");
    expect(screen.getByRole("button", { name: /^Date/ })).not.toHaveAttribute("aria-invalid");
  });
});

describe("DatePicker in en-CA", () => {
  it("shows the date the same way on every viewer's machine", () => {
    render(<DatePicker id="d" label="Applied" value="2026-11-07" onChange={vi.fn()} />);
    const shown = new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(2026, 10, 7));
    expect(screen.getByRole("button", { name: `Applied, ${shown}` })).toHaveTextContent(shown);
  });

  it("closes with Escape and gives focus back to its button", async () => {
    const user = userEvent.setup();
    render(<DatePicker id="d" label="Applied" value="2026-11-07" onChange={vi.fn()} />);
    const button = screen.getByRole("button", { name: /^Applied/ });
    await user.click(button);
    expect(screen.getByRole("grid")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
