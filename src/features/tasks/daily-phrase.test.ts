import { describe, expect, it } from "vitest";

import { buildDailyPhrase } from "@/features/tasks/daily-phrase";

// Thursday, 15 Oct 2026, 10:00 local time.
const now = new Date(2026, 9, 15, 10, 0);
const task = (overrides: Partial<Parameters<typeof buildDailyPhrase>[0][number]>) => ({
  title: "Tarefa",
  status: "todo",
  due_date: null,
  due_time: null,
  completed_at: null,
  ...overrides,
});

describe("buildDailyPhrase", () => {
  it("points at the oldest overdue task first", () => {
    const phrase = buildDailyPhrase(
      [
        task({ title: "Pagar boleto", due_date: "2026-10-12" }),
        task({ title: "Responder Ana", due_date: "2026-10-14" }),
      ],
      now,
    );
    expect(phrase).toBe("2 tarefas atrasadas. Comece por “Pagar boleto”.");
  });

  it("announces the next timed task today", () => {
    const phrase = buildDailyPhrase(
      [
        task({ title: "Reunião", due_date: "2026-10-15", due_time: "15:00:00" }),
        task({ title: "Café", due_date: "2026-10-15", due_time: "09:00:00" }),
      ],
      now,
    );
    expect(phrase).toBe("Próxima: “Reunião” às 15:00. Depois, mais 1 para hoje.");
  });

  it("celebrates when everything for today is done", () => {
    const phrase = buildDailyPhrase(
      [task({ status: "completed", completed_at: new Date(2026, 9, 15, 9).toISOString() })],
      now,
    );
    expect(phrase).toContain("Tudo de hoje concluído");
  });

  it("is gentle late at night", () => {
    const late = new Date(2026, 9, 15, 23, 30);
    expect(buildDailyPhrase([task({ due_date: "2026-10-15" })], late)).toContain("Descansar");
  });

  it("handles an empty list", () => {
    expect(buildDailyPhrase([], now)).toContain("Lista em branco");
  });
});
