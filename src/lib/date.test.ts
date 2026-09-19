import { afterEach, describe, expect, it, vi } from "vitest";

import { daysUntilPermanentDeletion } from "@/lib/date";

afterEach(() => vi.useRealTimers());

describe("daysUntilPermanentDeletion", () => {
  it("counts the seven-day retention window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-18T12:00:00.000Z"));

    expect(daysUntilPermanentDeletion("2026-09-18T12:00:00.000Z")).toBe(7);
    expect(daysUntilPermanentDeletion("2026-09-12T12:00:00.000Z")).toBe(1);
    expect(daysUntilPermanentDeletion("2026-09-10T12:00:00.000Z")).toBe(0);
  });
});
