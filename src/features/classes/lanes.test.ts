import { describe, expect, it } from "vitest";

import { layoutLanes } from "./schedule";

const slot = (starts_at: string, ends_at: string) => ({ starts_at, ends_at });

describe("layoutLanes", () => {
  it("puts items at the same time side by side", () => {
    const placed = layoutLanes([
      slot("08:00", "09:40"),
      slot("08:00", "09:40"),
    ]);
    expect(placed.map((entry) => [entry.lane, entry.lanes])).toEqual([
      [0, 2],
      [1, 2],
    ]);
  });

  it("keeps items that do not overlap at full width", () => {
    const placed = layoutLanes([
      slot("08:00", "09:00"),
      slot("09:00", "10:00"),
    ]);
    expect(placed.every((entry) => entry.lanes === 1 && entry.lane === 0)).toBe(
      true,
    );
  });

  it("reuses a lane once it is free inside one overlapping group", () => {
    const placed = layoutLanes([
      slot("08:00", "12:00"),
      slot("08:00", "09:00"),
      slot("09:30", "10:00"),
    ]);
    expect(placed.map((entry) => entry.lane)).toEqual([0, 1, 1]);
    expect(placed.every((entry) => entry.lanes === 2)).toBe(true);
  });
});
