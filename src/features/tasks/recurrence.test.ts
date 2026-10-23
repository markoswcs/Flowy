import { describe, expect, it } from "vitest";

import { alignToDays, daysToStore, recurrenceLabel, selectedDays } from "./recurrence";

// 2026-10-23 is a Friday (5).
const FRIDAY = "2026-10-23";

describe("selectedDays", () => {
  it("shows every day for a plain daily task and the date's weekday for a weekly one", () => {
    expect(selectedDays("daily", null, FRIDAY)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(selectedDays("weekly", null, FRIDAY)).toEqual([5]);
  });

  it("shows the saved days and nothing for monthly or no repeat", () => {
    expect(selectedDays("weekly", [3, 1], FRIDAY)).toEqual([1, 3]);
    expect(selectedDays("monthly", [1], FRIDAY)).toEqual([]);
    expect(selectedDays("none", null, FRIDAY)).toEqual([]);
  });
});

describe("daysToStore", () => {
  it("saves null when the choice is just the plain repeat", () => {
    expect(daysToStore("daily", [0, 1, 2, 3, 4, 5, 6], FRIDAY)).toBeNull();
    expect(daysToStore("weekly", [5], FRIDAY)).toBeNull();
  });

  it("saves the sorted days otherwise", () => {
    expect(daysToStore("daily", [5, 1, 3, 1], FRIDAY)).toEqual([1, 3, 5]);
    expect(daysToStore("weekly", [2], FRIDAY)).toEqual([2]);
  });

  it("never saves days for monthly repeats", () => {
    expect(daysToStore("monthly", [1, 2], FRIDAY)).toBeNull();
  });
});

describe("alignToDays", () => {
  it("keeps a date that already falls on a chosen day", () => {
    expect(alignToDays(FRIDAY, [1, 5])).toBe(FRIDAY);
  });

  it("moves to the next chosen day, across weeks and months", () => {
    expect(alignToDays(FRIDAY, [1, 3])).toBe("2026-10-26");
    expect(alignToDays("2026-10-30", [2])).toBe("2026-11-03");
  });

  it("leaves the date alone without days", () => {
    expect(alignToDays(FRIDAY, null)).toBe(FRIDAY);
  });
});

describe("recurrenceLabel", () => {
  it("names the plain repeats", () => {
    expect(recurrenceLabel("daily", null)).toBe("Diariamente");
    expect(recurrenceLabel("weekly", null)).toBe("Semanalmente");
    expect(recurrenceLabel("monthly", null)).toBe("Mensalmente");
  });

  it("names common groups and lists the rest Monday first", () => {
    expect(recurrenceLabel("daily", [1, 2, 3, 4, 5])).toBe("Dias úteis");
    expect(recurrenceLabel("weekly", [0, 6])).toBe("Fins de semana");
    expect(recurrenceLabel("daily", [5, 1, 3])).toBe("Seg, Qua e Sex");
    expect(recurrenceLabel("weekly", [0, 2])).toBe("Ter e Dom");
    expect(recurrenceLabel("weekly", [4])).toBe("Qui");
  });
});
