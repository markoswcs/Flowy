import { describe, expect, it } from "vitest";

import { EXERCISES } from "./exercises";
import { buildSession, sessionKeys } from "./plan";
import type { LoggedSet } from "./strength";
import {
  bestLifts,
  matchExercise,
  parseCsv,
  parseDay,
  platesPerSide,
  readWorkoutCsv,
  recoveringSlots,
  rotationKey,
  setsToCsv,
  totalLifted,
  yearWeeks,
} from "./training";

const set = (partial: Partial<LoggedSet>): LoggedSet => ({
  day: "2026-11-20",
  exercise_id: "barbell-squat",
  set_number: 1,
  amount: 5,
  weight_kg: 100,
  ...partial,
});

describe("platesPerSide", () => {
  it("loads the biggest plates first", () => {
    expect(platesPerSide(100, 20)).toEqual({ plates: [25, 15], leftover: 0 });
    expect(platesPerSide(62.5, 20)).toEqual({ plates: [20, 1.25], leftover: 0 });
  });
  it("reports what the plates cannot make", () => {
    expect(platesPerSide(61, 20, [20, 10, 5])).toEqual({ plates: [20], leftover: 1 });
  });
  it("needs nothing at or below the bar", () => {
    expect(platesPerSide(20, 20).plates).toEqual([]);
  });
});

describe("progress", () => {
  it("leaves warm-up sets out of totals and best lifts", () => {
    const history = [set({}), set({ set_number: 2, weight_kg: 140, amount: 1, kind: "warmup" })];
    expect(totalLifted(history)).toBe(500);
    expect(bestLifts(history).get("barbell-squat")?.oneRepMax).toBeCloseTo(116.7, 1);
  });
  it("marks groups trained yesterday or today as recovering", () => {
    const slots = recoveringSlots(
      [set({ day: "2026-11-22" }), set({ day: "2026-11-18", exercise_id: "barbell-bench-press" })],
      (id) => EXERCISES.find((exercise) => exercise.id === id)?.slot,
      "2026-11-23",
    );
    expect([...slots]).toEqual(["squat"]);
  });
  it("lays out 53 weeks ending today", () => {
    const weeks = yearWeeks("2026-11-23");
    expect(weeks).toHaveLength(53);
    expect(weeks.flat()).toContain("2026-11-23");
    expect(weeks.flat()).not.toContain("2026-11-24");
  });
});

describe("rotation and splits", () => {
  it("does the workout after the last one done", () => {
    const keys = ["push", "pull", "legs"];
    expect(rotationKey(keys, [], "2026-11-23")).toBe("push");
    expect(rotationKey(keys, [{ day: "2026-11-20", session: "push" }, { day: "2026-11-21", session: "pull" }], "2026-11-23")).toBe("legs");
    expect(rotationKey(keys, [{ day: "2026-11-22", session: "legs" }], "2026-11-23")).toBe("push");
  });
  it("keeps every workout of a split even with fewer days", () => {
    expect(sessionKeys({ goal: "health", days: [1, 4], split: "ppl" })).toEqual(["push", "pull", "legs"]);
    expect(sessionKeys({ goal: "health", days: [1, 3, 5, 6], split: "upper_lower" })).toEqual(["upper", "lower", "upper-2", "lower-2"]);
  });
  it("gives 5 × 5 heavy sets", () => {
    const session = buildSession(
      { goal: "gain_muscle", level: "advanced", days: [1, 3, 5], minutes: 45, place: "gym", limitations: [], intensity: 0, swaps: {}, split: "five" },
      "five_a",
    );
    expect(session.exercises).toHaveLength(3);
    expect(session.exercises.every((item) => item.sets === 5 && item.amount === 5)).toBe(true);
  });
});

describe("import and export", () => {
  it("reads quoted CSV fields", () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });
  it("reads dates from Strong, Hevy and Brazilian sheets", () => {
    expect(parseDay("2026-11-20 18:03:00")).toBe("2026-11-20");
    expect(parseDay("20 Nov 2026, 18:03")).toBe("2026-11-20");
    expect(parseDay("20/11/2026")).toBe("2026-11-20");
  });
  it("reads a Strong export", () => {
    const csv = [
      "Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE",
      '2026-11-20 18:03:00,"Legs",1h,"Squat (Barbell)",W,60,8,0,0,,,',
      '2026-11-20 18:03:00,"Legs",1h,"Squat (Barbell)",1,100,5,0,0,,,8',
    ].join("\n");
    const rows = readWorkoutCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: "warmup", set_number: 1, weight_kg: 60 });
    expect(rows[1]).toMatchObject({ kind: "normal", set_number: 2, amount: 5, rir: 2 });
    expect(matchExercise(rows[1]!.name, EXERCISES)).toBe("barbell-squat");
  });
  it("reads a Hevy export", () => {
    const csv = [
      "title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe",
      'Push,"20 Nov 2026, 18:00","20 Nov 2026, 19:00",,"Bench Press (Barbell)",,,0,normal,80,8,,,',
    ].join("\n");
    const [row] = readWorkoutCsv(csv);
    expect(row).toMatchObject({ day: "2026-11-20", amount: 8, weight_kg: 80 });
    expect(matchExercise(row!.name, EXERCISES)).toBe("barbell-bench-press");
  });
  it("exports what it can import back", () => {
    const csv = setsToCsv([set({ kind: "drop", rir: 1 })], (id) => EXERCISES.find((exercise) => exercise.id === id)!.name);
    const [row] = readWorkoutCsv(csv);
    expect(row).toMatchObject({ day: "2026-11-20", amount: 5, weight_kg: 100, kind: "drop", rir: 1 });
    expect(matchExercise(row!.name, EXERCISES)).toBe("barbell-squat");
  });
});
