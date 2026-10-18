import { describe, expect, it } from "vitest";

import { parseSection, SECTION_KIND } from "@/features/notes/note-sections";

describe("note sections", () => {
  it("keeps notes, maps and drawings apart", () => {
    expect(parseSection("nota")).toBe("nota");
    expect(parseSection("mapa")).toBe("mapa");
    expect(parseSection("desenho")).toBe("desenho");
    expect(new Set(Object.values(SECTION_KIND)).size).toBe(3);
  });

  it("sends old and unknown links somewhere sensible", () => {
    expect(parseSection("fluxo")).toBe("mapa");
    expect(parseSection(null)).toBe("nota");
    expect(parseSection("qualquer")).toBe("nota");
  });
});
