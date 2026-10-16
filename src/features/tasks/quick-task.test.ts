import { describe, expect, it } from "vitest";

import { parseQuickTask } from "@/features/tasks/quick-task";

// Thursday, 15 Oct 2026, 10:00 local time.
const now = new Date(2026, 9, 15, 10, 0);

describe("parseQuickTask", () => {
  it("keeps plain titles untouched", () => {
    expect(parseQuickTask("Comprar café", now)).toEqual({
      title: "Comprar café",
      due_date: null,
      due_time: null,
    });
  });

  it("reads relative days and times", () => {
    expect(parseQuickTask("Enviar proposta amanhã às 15h", now)).toEqual({
      title: "Enviar proposta",
      due_date: "2026-10-16",
      due_time: "15:00",
    });
    expect(parseQuickTask("Ligar pro cliente hoje 9h30", now)).toMatchObject({
      title: "Ligar pro cliente",
      due_date: "2026-10-15",
      due_time: "09:30",
    });
  });

  it("assumes today when only a time is given", () => {
    expect(parseQuickTask("Reunião 14:45", now)).toMatchObject({
      title: "Reunião",
      due_date: "2026-10-15",
      due_time: "14:45",
    });
  });

  it("reads the next weekday", () => {
    expect(parseQuickTask("Post do cliente sexta", now).due_date).toBe("2026-10-16");
    expect(parseQuickTask("Revisão na quarta-feira", now).due_date).toBe("2026-10-21");
  });

  it("reads dd/mm dates and rolls past ones to next year", () => {
    expect(parseQuickTask("Entrega 20/10", now).due_date).toBe("2026-10-20");
    expect(parseQuickTask("Planejamento 10/01", now).due_date).toBe("2027-01-10");
  });

  it("ignores numbers that are not times", () => {
    expect(parseQuickTask("Ler 3 capítulos", now)).toMatchObject({
      title: "Ler 3 capítulos",
      due_time: null,
    });
  });

  it("moves a past 12-hour time to the evening when written at night", () => {
    const night = new Date(2026, 9, 15, 23, 25);
    expect(parseQuickTask("Teste de notificação 11:26", night)).toMatchObject({
      due_date: "2026-10-15",
      due_time: "23:26",
    });
  });

  it("keeps morning times that are still ahead", () => {
    expect(parseQuickTask("Reunião 11:26", now).due_time).toBe("11:26");
  });

  it("reads periods such as da noite and pm", () => {
    expect(parseQuickTask("Ligar 8 da noite", now)).toMatchObject({ title: "Ligar", due_time: "20:00" });
    expect(parseQuickTask("Ligar 3pm", now).due_time).toBe("15:00");
    expect(parseQuickTask("Café 7h da manhã amanhã", now)).toMatchObject({
      title: "Café",
      due_date: "2026-10-16",
      due_time: "07:00",
    });
  });

  it("does not treat plain numbers as times", () => {
    expect(parseQuickTask("Comprar 2 pães", now).due_time).toBeNull();
  });
});
