import { describe, expect, it } from "vitest";

import { searchExercises } from "./exercise-catalog";

describe("catalog search", () => {
  it("ignores accents and case and matches every word", () => {
    expect(searchExercises("tricéps", "all").map(({ id }) => id)).toEqual(
      expect.arrayContaining(["triceps-pushdown", "bench-dip"]),
    );
    expect(searchExercises("AGACHAMENTO barra", "all").map(({ id }) => id)).toEqual(["barbell-squat"]);
  });

  it("filters by group", () => {
    const arms = searchExercises("", "arms");
    expect(arms.length).toBeGreaterThan(0);
    expect(arms.every((exercise) => exercise.slot === "arms")).toBe(true);
  });
});
