import { describe, expect, it } from "vitest";

import { hours, levelOf, longestStreak } from "./streak-levels";

describe("streak levels", () => {
  it("names the level and what is left for the next one", () => {
    expect(levelOf(0).name).toBe("Começando");
    expect(levelOf(5)).toMatchObject({ name: "Chama", toNext: 2 });
    expect(levelOf(40)).toMatchObject({ name: "Lenda", next: null, toNext: 0 });
  });

  it("keeps a run going over one missed day, not two", () => {
    expect(longestStreak(["2026-11-01", "2026-11-02", "2026-11-04", "2026-11-05"])).toBe(4);
    expect(longestStreak(["2026-11-01", "2026-11-02", "2026-11-05"])).toBe(2);
  });

  it("writes training time simply", () => {
    expect(hours(45)).toBe("45 min");
    expect(hours(360)).toBe("6 h");
    expect(hours(90)).toBe("1 h 30");
  });
});
