import { describe, expect, it } from "vitest";

import { dumpToTasks } from "./brain-dump";

describe("brain dump", () => {
  it("makes one task per line, tomorrow unless the line says when", () => {
    const now = new Date(2026, 10, 11, 21, 30);
    const tasks = dumpToTasks("- Levar o carro na revisão\n\n2) Dentista sexta 15h\n   ", now);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toEqual({ title: "Levar o carro na revisão", due_date: "2026-11-12", due_time: null });
    expect(tasks[1]!.due_date).toBe("2026-11-13");
    expect(tasks[1]!.due_time?.slice(0, 5)).toBe("15:00");
  });
});
