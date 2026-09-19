import { describe, expect, it } from "vitest";

import { getInitials, safeNextPath } from "@/lib/utils";

describe("safeNextPath", () => {
  it("keeps safe local paths", () => {
    expect(safeNextPath("/app/tasks?view=today#list")).toBe(
      "/app/tasks?view=today#list",
    );
  });

  it.each([
    "https://example.com",
    "//example.com",
    "/%2F%2Fevil.example",
    "/%5Cevil.example",
    "/app\\settings",
    "/app\r\nLocation: https://evil.example",
  ])("rejects unsafe redirect %s", (value) => {
    expect(safeNextPath(value)).toBe("/app");
  });

  it("uses the requested fallback", () => {
    expect(safeNextPath(null, "/login")).toBe("/login");
  });
});

describe("getInitials", () => {
  it("returns at most two initials", () => {
    expect(getInitials("Maria da Silva")).toBe("MD");
  });

  it("uses the Flowy fallback for an empty name", () => {
    expect(getInitials("  ")).toBe("FL");
  });
});
