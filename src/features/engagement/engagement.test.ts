import type { Task } from "@/types/productivity";
import { describe, expect, it } from "vitest";

import { countdownLabel, countdowns, hasStudyPlan, isDeadline, streak, studyPlan } from "./engagement";

const task = (id: string, title: string, due_date: string | null, status = "todo") =>
  ({ id, title, due_date, status, deleted_at: null }) as unknown as Task;

describe("tests and deadlines", () => {
  it("recognizes tests and deliveries by their name", () => {
    expect(isDeadline("Prova de Anatomia")).toBe(true);
    expect(isDeadline("Entrega do relatório")).toBe(true);
    expect(isDeadline("Seminário ruminantes")).toBe(true);
    expect(isDeadline("P2 de Cálculo")).toBe(true);
    expect(isDeadline("Comprar pão")).toBe(false);
    expect(isDeadline("📚 Estudar: Prova de Anatomia (1/3)")).toBe(false);
  });

  it("counts down the next three weeks, closest first", () => {
    const list = countdowns(
      [
        task("a", "Prova de Bioquímica", "2026-11-20"),
        task("b", "Entrega TCC", "2026-11-12"),
        task("c", "Prova antiga", "2026-11-01"),
        task("d", "Prova longe", "2027-01-20"),
        task("e", "Prova feita", "2026-11-13", "completed"),
        task("b", "Entrega TCC", "2026-11-12"),
      ],
      "2026-11-11",
    );
    expect(list.map(({ task: item, days }) => [item.id, days])).toEqual([
      ["b", 1],
      ["a", 9],
    ]);
    expect(countdownLabel(0)).toBe("é hoje!");
    expect(countdownLabel(1)).toBe("é amanhã");
    expect(countdownLabel(9)).toBe("em 9 dias");
  });

  it("spreads up to five study sessions before the test", () => {
    const plan = studyPlan("Prova de Anatomia", "2026-11-11", "2026-11-20");
    expect(plan).toHaveLength(5);
    expect(plan[0]).toEqual({ title: "📚 Estudar: Prova de Anatomia (1/5)", due_date: "2026-11-11" });
    expect(plan.at(-1)!.due_date < "2026-11-20").toBe(true);
    expect(studyPlan("Prova", "2026-11-11", "2026-11-12")).toEqual([
      { title: "📚 Estudar: Prova", due_date: "2026-11-11" },
    ]);
    expect(studyPlan("Prova", "2026-11-11", "2026-11-11")).toEqual([]);
    expect(hasStudyPlan("Prova de Anatomia", plan.map((item) => ({ ...item, deleted_at: null })))).toBe(true);
  });
});

describe("streak", () => {
  const at = (day: string) => day;

  it("counts days in a row with something done", () => {
    expect(streak([at("2026-11-11"), at("2026-11-10"), at("2026-11-10"), at("2026-11-09")], "2026-11-11")).toBe(3);
  });

  it("keeps yesterday's streak alive until today has something done", () => {
    expect(streak([at("2026-11-10"), at("2026-11-09")], "2026-11-11")).toBe(2);
    expect(streak([at("2026-11-08")], "2026-11-11")).toBe(0);
    expect(streak([], "2026-11-11")).toBe(0);
  });
});
