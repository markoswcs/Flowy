import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render as baseRender,
  screen,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TaskComposer } from "@/features/tasks/components/task-composer";
import type { Category, Folder } from "@/types/productivity";

const mutate = vi.fn();
let history: { title: string; folder_id: string | null; status: string }[] = [];

vi.mock("@/features/tasks/use-tasks", () => ({
  useCreateTask: () => ({ mutate, isPending: false }),
  useTasks: () => ({ data: history }),
}));
vi.mock("@/providers/notification-provider", () => ({
  useNotifications: () => ({ addNotification: vi.fn() }),
}));

const folder = (id: string, name: string) =>
  ({ id, name, color: null }) as Folder;
const folders = [
  folder("f-roberto", "Roberto"),
  folder("f-pessoal", "Pessoal"),
];
const categories = [
  { id: "c-comercial", name: "Comercial", color: "#f00" },
] as Category[];

function render(element: ReactElement) {
  return baseRender(
    <QueryClientProvider client={new QueryClient()}>
      {element}
    </QueryClientProvider>,
  );
}

function typeAndSubmit(text: string) {
  fireEvent.change(screen.getByLabelText("Título da nova tarefa"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Criar" }));
}

beforeEach(() => {
  mutate.mockReset();
  history = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TaskComposer", () => {
  it("creates a structured task from a natural sentence", () => {
    render(<TaskComposer folders={folders} categories={categories} />);
    typeAndSubmit(
      "Preciso finalizar urgentemente a apresentação comercial do cliente Roberto até amanhã às 14h, incluindo os resultados da campanha.",
    );
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0]![0]).toEqual({
      title: "Finalizar a apresentação comercial",
      description: "Incluir os resultados da campanha.",
      due_date: "2026-10-16",
      due_time: "14:00",
      recurrence: null,
      recurrence_days: null,
      priority: "high",
      folder_id: "f-roberto",
      category_ids: ["c-comercial"],
    });
  });

  it("keeps plain manual creation unchanged", () => {
    render(<TaskComposer folders={folders} categories={categories} />);
    typeAndSubmit("Ligar para a Ana");
    expect(mutate.mock.calls[0]![0]).toMatchObject({
      title: "Ligar para a Ana",
      description: null,
      due_date: null,
      priority: "normal",
      folder_id: null,
    });
  });

  it("asks for review before creating a likely duplicate", () => {
    history = [{ title: "Enviar relatório", folder_id: null, status: "todo" }];
    render(<TaskComposer folders={folders} categories={categories} />);
    typeAndSubmit("Enviar relatório amanhã");
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Já existe uma tarefa aberta",
    );
    // The interpreted fields are now editable; confirming creates it.
    expect(screen.getByLabelText("Título da nova tarefa")).toHaveValue(
      "Enviar relatório",
    );
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(mutate.mock.calls[0]![0]).toMatchObject({
      title: "Enviar relatório",
      due_date: "2026-10-16",
    });
  });

  it("pre-fills fields from text handed over by another flow", () => {
    render(
      <TaskComposer
        folders={folders}
        categories={categories}
        initialText="Regar as plantas todo dia sem pressa na pasta pessoal. Usar o adubo novo."
      />,
    );
    expect(screen.getByLabelText("Título da nova tarefa")).toHaveValue(
      "Regar as plantas",
    );
    expect(screen.getByLabelText("Descrição")).toHaveValue(
      "Usar o adubo novo.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(mutate.mock.calls[0]![0]).toMatchObject({
      recurrence: "daily",
      due_date: "2026-10-15",
      priority: "low",
      folder_id: "f-pessoal",
    });
  });

  it("limits a daily repeat to the weekdays picked", () => {
    render(
      <TaskComposer
        folders={folders}
        categories={categories}
        initialText="Regar as plantas todo dia"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dias úteis" }));
    fireEvent.click(screen.getByRole("button", { name: "Sexta" }));
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(mutate.mock.calls[0]![0]).toMatchObject({
      recurrence: "daily",
      recurrence_days: [1, 2, 3, 4],
      due_date: "2026-10-15",
    });
  });

  it("saves no weekdays when every day stays selected", () => {
    render(
      <TaskComposer
        folders={folders}
        categories={categories}
        initialText="Regar as plantas todo dia"
      />,
    );
    expect(screen.getByRole("button", { name: "Domingo" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    expect(mutate.mock.calls[0]![0]).toMatchObject({ recurrence: "daily", recurrence_days: null });
  });
});
