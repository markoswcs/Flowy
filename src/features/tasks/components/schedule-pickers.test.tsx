import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DatePickerSheet, TimePickerSheet } from "./schedule-pickers";

afterEach(cleanup);

describe("TimePickerSheet", () => {
  it("sets a time from an hour and minutes", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(<TimePickerSheet value="" onChange={onChange} onClose={onClose} />);
    expect(screen.getByRole("button", { name: "Escolha a hora" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "14" }));
    fireEvent.click(screen.getByRole("button", { name: ":30" }));
    fireEvent.click(screen.getByRole("button", { name: "Definir 14:30" }));
    expect(onChange).toHaveBeenCalledWith("14:30");
    expect(onClose).toHaveBeenCalled();
  });

  it("sets a shortcut in one tap", () => {
    const onChange = vi.fn();
    render(<TimePickerSheet value="09:00" onChange={onChange} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "18:00" }));
    expect(onChange).toHaveBeenCalledWith("18:00");
  });
});

describe("DatePickerSheet", () => {
  it("picks a day of the month", () => {
    const onChange = vi.fn();
    render(<DatePickerSheet value="2026-11-13" onChange={onChange} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: /20 de novembro de 2026/ }));
    expect(onChange).toHaveBeenCalledWith("2026-11-20");
  });

  it("moves to the next month", () => {
    render(<DatePickerSheet value="2026-11-13" onChange={() => undefined} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByText(/dezembro de 2026/i)).toBeInTheDocument();
  });
});
