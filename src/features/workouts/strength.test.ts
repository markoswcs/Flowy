import { describe, expect, it } from "vitest";

import {
  estimateOneRepMax,
  isPersonalRecord,
  lastSession,
  progressByDay,
  setsPerSlot,
  suggestNext,
  weeklyRate,
  type LoggedSet,
} from "./strength";

const set = (day: string, exercise_id: string, set_number: number, amount: number, weight_kg: number | null): LoggedSet => ({
  day,
  exercise_id,
  set_number,
  amount,
  weight_kg,
});

describe("strength", () => {
  it("estimates the one-rep max", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(60, 10)).toBe(80);
    expect(estimateOneRepMax(0, 10)).toBe(0);
  });

  it("spots records, never on the first time", () => {
    const before = [set("2026-11-01", "bench", 1, 10, 40)];
    expect(isPersonalRecord({ amount: 10, weight_kg: 42.5 }, before)).toBe(true);
    expect(isPersonalRecord({ amount: 8, weight_kg: 40 }, before)).toBe(false);
    expect(isPersonalRecord({ amount: 10, weight_kg: 40 }, [])).toBe(false);
    // Body weight only: more reps is the record.
    expect(isPersonalRecord({ amount: 16, weight_kg: null }, [set("2026-11-01", "pushup", 1, 15, null)])).toBe(true);
  });

  it("finds the last session before a day", () => {
    const history = [
      set("2026-11-01", "bench", 1, 10, 40),
      set("2026-11-08", "bench", 2, 9, 42.5),
      set("2026-11-08", "bench", 1, 10, 42.5),
      set("2026-11-15", "bench", 1, 10, 45),
      set("2026-11-08", "squat", 1, 8, 60),
    ];
    expect(lastSession(history, "bench", "2026-11-15").map((item) => item.set_number)).toEqual([1, 2]);
    expect(lastSession(history, "bench", "2026-11-01")).toEqual([]);
  });

  it("suggests more load only when every set hit the reps", () => {
    expect(suggestNext([set("d", "x", 1, 10, 40), set("d", "x", 2, 10, 40)], 10)?.weight).toBe(42.5);
    expect(suggestNext([set("d", "x", 1, 10, 40), set("d", "x", 2, 8, 40)], 10)?.weight).toBe(40);
    expect(suggestNext([set("d", "x", 1, 12, 8)], 12)?.weight).toBe(9);
    expect(suggestNext([set("d", "x", 1, 15, null)], 12)).toBeNull();
  });

  it("charts the best of each day", () => {
    const history = [set("2026-11-08", "bench", 1, 10, 42.5), set("2026-11-01", "bench", 1, 10, 40), set("2026-11-01", "bench", 2, 5, 45)];
    expect(progressByDay(history, "bench")).toEqual([
      { day: "2026-11-01", value: 53.3 },
      { day: "2026-11-08", value: 56.7 },
    ]);
  });

  it("counts sets per muscle group in a period", () => {
    const history = [set("2026-11-20", "bench", 1, 10, 40), set("2026-11-20", "bench", 2, 10, 40), set("2026-11-10", "squat", 1, 8, 60)];
    const slotOf = (id: string): "push" | "squat" => (id === "bench" ? "push" : "squat");
    expect(setsPerSlot(history, slotOf, "2026-11-17", "2026-11-23")).toEqual({ push: 2 });
  });

  it("gives the weekly body-weight rate", () => {
    expect(weeklyRate([{ day: "2026-11-01", weight_kg: 80 }, { day: "2026-11-15", weight_kg: 79 }])).toBe(-0.5);
    expect(weeklyRate([{ day: "2026-11-01", weight_kg: 80 }])).toBeNull();
  });
});
