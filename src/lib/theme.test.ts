import { describe, expect, it } from "vitest";

import { normalizeThemePreference } from "@/lib/theme";

describe("normalizeThemePreference", () => {
  it.each(["purple", "black", "white"]) (
    "keeps the supported %s theme",
    (theme) => {
      expect(normalizeThemePreference(theme)).toBe(theme);
    },
  );

  it.each(["light", "dark", "system", null, undefined])(
    "uses purple for legacy or missing theme %s",
    (theme) => {
      expect(normalizeThemePreference(theme)).toBe("purple");
    },
  );
});
