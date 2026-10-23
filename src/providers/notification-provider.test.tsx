import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/lib/toast";
import { notify, NotificationProvider } from "@/providers/notification-provider";

describe("NotificationProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<NotificationProvider>{null}</NotificationProvider>);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows one short banner at a time, the newest one", () => {
    act(() => notify("Tarefa criada", { description: "Comprar pão" }));
    act(() => notify("Nota salva"));
    expect(screen.queryByText("Tarefa criada")).toBeNull();
    expect(screen.getByText("Nota salva")).toBeTruthy();
    // Confirmations stay a title only.
    expect(screen.queryByText("Comprar pão")).toBeNull();
  });

  it("does not repeat the same message", () => {
    act(() => notify("Tarefa criada"));
    act(() => notify("Tarefa criada"));
    expect(screen.getAllByText("Tarefa criada")).toHaveLength(1);
  });

  it("keeps the explanation of an error", () => {
    act(() => toast.error("Não foi possível criar a tarefa.", { description: "Sem conexão." }));
    expect(screen.getByText("Sem conexão.")).toBeTruthy();
  });

  it("offers Desfazer and leaves after a while", () => {
    const undo = vi.fn();
    act(() => notify("Movida para a lixeira", { action: { label: "Desfazer", onClick: undo } }));
    fireEvent.click(screen.getByText("Desfazer"));
    expect(undo).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByText("Movida para a lixeira")).toBeNull();
  });
});
