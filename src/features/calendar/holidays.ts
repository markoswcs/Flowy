import { addDaysKey } from "@/features/tasks/pickers";

export interface Holiday {
  date: string;
  name: string;
  /** Carnaval and Corpus Christi are "ponto facultativo", not a legal holiday. */
  optional?: boolean;
}

/** Easter Sunday (Gregorian, Meeus/Jones/Butcher) as "YYYY-MM-DD". */
export function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Brazil's national holidays of a year, computed here (no outside service, so
 * the calendar never waits or breaks): fixed dates plus the ones tied to Easter.
 */
export function brazilHolidays(year: number): Holiday[] {
  const fixed = (md: string, name: string): Holiday => ({ date: `${year}-${md}`, name });
  const sunday = easter(year);
  const list: Holiday[] = [
    fixed("01-01", "Confraternização Universal"),
    { date: addDaysKey(sunday, -48), name: "Carnaval", optional: true },
    { date: addDaysKey(sunday, -47), name: "Carnaval", optional: true },
    { date: addDaysKey(sunday, -2), name: "Sexta-feira Santa" },
    fixed("04-21", "Tiradentes"),
    fixed("05-01", "Dia do Trabalho"),
    { date: addDaysKey(sunday, 60), name: "Corpus Christi", optional: true },
    fixed("09-07", "Independência do Brasil"),
    fixed("10-12", "Nossa Senhora Aparecida"),
    fixed("11-02", "Finados"),
    fixed("11-15", "Proclamação da República"),
    fixed("12-25", "Natal"),
  ];
  // National holiday since 2024 (Lei 14.759/2023).
  if (year >= 2024) list.push(fixed("11-20", "Consciência Negra"));
  return list.sort((x, y) => x.date.localeCompare(y.date));
}

/** Holidays by date for the years a month view touches. */
export function holidayMap(years: number[]): Map<string, Holiday> {
  const map = new Map<string, Holiday>();
  for (const year of new Set(years)) for (const holiday of brazilHolidays(year)) map.set(holiday.date, holiday);
  return map;
}
