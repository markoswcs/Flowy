import { describe, expect, it } from "vitest";

import { addDaysKey, inOneHour, monthGrid, quickDates } from "./pickers";

describe("pickers", () => {
  it("adds days across months", () => {
    expect(addDaysKey("2026-11-29", 3)).toBe("2026-12-02");
  });

  it("lays a month out from Sunday", () => {
    const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(grid[0]).toBe("2026-11-01");
    expect(grid.filter(Boolean)).toHaveLength(30);
    expect(grid.length % 7).toBe(0);
    const december = monthGrid(2026, 11); // starts on a Tuesday
    expect(december.slice(0, 3)).toEqual([null, null, "2026-12-01"]);
  });

  it("offers the coming Saturday and Monday", () => {
    // 2026-11-13 is a Friday.
    expect(quickDates("2026-11-13")).toEqual([
      { label: "Hoje", value: "2026-11-13" },
      { label: "Amanhã", value: "2026-11-14" },
      { label: "Segunda", value: "2026-11-16" },
      { label: "Em 1 semana", value: "2026-11-20" },
    ]);
  });

  it("rounds an hour from now up to 5 minutes", () => {
    expect(inOneHour(new Date(2026, 10, 13, 14, 2))).toBe("15:05");
    expect(inOneHour(new Date(2026, 10, 13, 23, 58))).toBe("01:00");
  });
});
