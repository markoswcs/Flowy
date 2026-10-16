import { describe, expect, it } from "vitest";

import { relativeTaskDate } from "@/features/tasks/date-utils";

// Thursday, 15 Oct 2026.
const now = new Date(2026, 9, 15, 10, 0);

describe("relativeTaskDate", () => {
  it("names today, tomorrow and yesterday", () => {
    expect(relativeTaskDate("2026-10-15", now)).toEqual({ label: "Hoje", tone: "today" });
    expect(relativeTaskDate("2026-10-16", now)).toEqual({ label: "Amanhã", tone: "soon" });
    expect(relativeTaskDate("2026-10-14", now)).toEqual({ label: "Ontem", tone: "overdue" });
  });

  it("counts overdue days", () => {
    expect(relativeTaskDate("2026-10-12", now)?.label).toBe("Atrasada · 3 dias");
  });

  it("uses the weekday within a week", () => {
    expect(relativeTaskDate("2026-10-19", now)?.label).toBe("Segunda");
  });

  it("falls back to a short date further out", () => {
    expect(relativeTaskDate("2026-11-30", now)?.tone).toBe("later");
  });

  it("returns null without a date", () => {
    expect(relativeTaskDate(null, now)).toBeNull();
  });
});
