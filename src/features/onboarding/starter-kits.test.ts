import { describe, expect, it } from "vitest";

import {
  missingStarterItems,
  STARTER_FOLDERS,
  STARTER_PROFILES,
  STARTER_TAGS,
} from "@/features/onboarding/starter-kits";

describe("missingStarterItems", () => {
  it("returns only picked items in catalog order", () => {
    const result = missingStarterItems(["Pessoal", "Trabalho"], STARTER_FOLDERS, []);
    expect(result.map((item) => item.name)).toEqual(["Trabalho", "Pessoal"]);
  });

  it("skips names the person already has, ignoring case and accents", () => {
    const result = missingStarterItems(
      ["Saúde", "Finanças", "Estudos"],
      STARTER_FOLDERS,
      [{ name: "saude" }, { name: "FINANCAS" }],
    );
    expect(result.map((item) => item.name)).toEqual(["Estudos"]);
  });

  it("ignores names outside the catalog", () => {
    expect(missingStarterItems(["Inventada"], STARTER_TAGS, [])).toEqual([]);
  });
});

describe("starter profiles", () => {
  it("only reference catalog items", () => {
    const folders = new Set(STARTER_FOLDERS.map((item) => item.name));
    const tags = new Set(STARTER_TAGS.map((item) => item.name));
    for (const profile of STARTER_PROFILES) {
      expect(profile.folders.every((name) => folders.has(name))).toBe(true);
      expect(profile.tags.every((name) => tags.has(name))).toBe(true);
    }
  });

  it("use valid hex colors accepted by the database", () => {
    for (const item of [...STARTER_FOLDERS, ...STARTER_TAGS]) {
      expect(item.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
