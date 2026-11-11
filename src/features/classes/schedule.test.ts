import { describe, expect, it } from "vitest";

import { classNow, inTime, type ClassSlot } from "./schedule";

const slot = (id: string, weekday: number, starts_at: string, ends_at: string) =>
  ({ id, user_id: "u", name: id, room: null, weekday, starts_at, ends_at, created_at: "" }) as ClassSlot;

describe("class schedule", () => {
  // 2026-11-11 is a Wednesday (3).
  const slots = [slot("Anatomia", 3, "08:00:00", "09:40:00"), slot("Bioquímica", 3, "10:00:00", "11:40:00"), slot("Física", 4, "08:00:00", "10:00:00")];

  it("tells the class going on and the next one today", () => {
    const during = classNow(slots, new Date(2026, 10, 11, 9, 20));
    expect(during.ongoing?.name).toBe("Anatomia");
    expect(during.next?.name).toBe("Bioquímica");
    expect(during.minutesToNext).toBe(40);
  });

  it("has nothing once the day's classes are over", () => {
    const after = classNow(slots, new Date(2026, 10, 11, 12, 0));
    expect(after.ongoing).toBeNull();
    expect(after.next).toBeNull();
  });

  it("says how long until the next one", () => {
    expect(inTime(25)).toBe("em 25 min");
    expect(inTime(60)).toBe("em 1h");
    expect(inTime(70)).toBe("em 1h10");
  });
});
