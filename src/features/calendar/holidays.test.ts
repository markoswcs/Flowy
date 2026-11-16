import { describe, expect, it } from "vitest";

import { brazilHolidays, easter } from "./holidays";

describe("holidays", () => {
  it("finds Easter", () => {
    expect(easter(2025)).toBe("2025-04-20");
    expect(easter(2026)).toBe("2026-04-05");
    expect(easter(2027)).toBe("2027-03-28");
  });

  it("lists 2026 with the Easter-based days", () => {
    const byDate = Object.fromEntries(brazilHolidays(2026).map((holiday) => [holiday.date, holiday.name]));
    expect(byDate["2026-02-16"]).toBe("Carnaval");
    expect(byDate["2026-02-17"]).toBe("Carnaval");
    expect(byDate["2026-04-03"]).toBe("Sexta-feira Santa");
    expect(byDate["2026-06-04"]).toBe("Corpus Christi");
    expect(byDate["2026-11-15"]).toBe("Proclamação da República");
    expect(byDate["2026-11-20"]).toBe("Consciência Negra");
    expect(brazilHolidays(2026)).toHaveLength(13);
  });
});
