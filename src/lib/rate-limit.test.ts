import { beforeEach, describe, expect, it } from "vitest";

import { rateLimit, resetRateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(resetRateLimit);

  it("lets requests through up to the limit, per key", () => {
    const now = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("a", 3, now)).toBe(true);
    expect(rateLimit("a", 3, now)).toBe(false);
    expect(rateLimit("b", 3, now)).toBe(true);
  });

  it("opens again in the next minute", () => {
    const now = 1_000_000;
    for (let i = 0; i < 4; i++) rateLimit("a", 3, now);
    expect(rateLimit("a", 3, now + 60_000)).toBe(true);
  });
});
