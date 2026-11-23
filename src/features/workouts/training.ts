import type { Slot } from "./exercises";
import { estimateOneRepMax, type LoggedSet } from "./strength";

/* ---------- Tipos de série e esforço ---------- */

export type SetKind = "normal" | "warmup" | "drop" | "failure";

export const SET_KINDS: { kind: SetKind; short: string; label: string }[] = [
  { kind: "normal", short: "", label: "Normal" },
  { kind: "warmup", short: "A", label: "Aquecimento" },
  { kind: "drop", short: "D", label: "Drop set" },
  { kind: "failure", short: "F", label: "Até a falha" },
];

/** Repetições na reserva (RIR): quantas ainda daria para fazer. */
export const RIR_LEVELS: { value: number; label: string }[] = [
  { value: 0, label: "0 · não saía mais nenhuma" },
  { value: 1, label: "1 · saía só mais uma" },
  { value: 2, label: "2 · sobravam duas" },
  { value: 3, label: "3 · sobravam três" },
  { value: 4, label: "4 · bem tranquilo" },
  { value: 5, label: "5+ · muito leve" },
];

export const rirColor = (rir: number) =>
  rir <= 0 ? "text-red-400" : rir === 1 ? "text-orange-300" : rir <= 3 ? "text-emerald-400" : "text-sky-300";

/** Aquecimento não conta para recordes, volume nem mapa muscular. */
export const working = <T extends Pick<LoggedSet, "kind">>(sets: T[]) => sets.filter((set) => set.kind !== "warmup");

/* ---------- Anilhas ---------- */

export const BARS = [
  { id: "olympic", label: "Barra olímpica", weight: 20 },
  { id: "women", label: "Barra 15 kg", weight: 15 },
  { id: "ez", label: "Barra W", weight: 10 },
  { id: "smith", label: "Smith", weight: 0 },
] as const;

export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/**
 * Anilhas de cada lado para chegar ao peso: as maiores primeiro, com o que a
 * pessoa tem (cada valor em pares ilimitados). `leftover` é o que não fecha.
 */
export function platesPerSide(target: number, bar: number, plates: number[] = DEFAULT_PLATES) {
  const sorted = [...new Set(plates)].filter((plate) => plate > 0).sort((a, b) => b - a);
  let side = Math.round(((target - bar) / 2) * 1000) / 1000;
  if (side <= 0) return { plates: [] as number[], leftover: Math.max(0, Math.round((target - bar) * 100) / 100) };
  const used: number[] = [];
  for (const plate of sorted) {
    while (side + 1e-9 >= plate) {
      used.push(plate);
      side = Math.round((side - plate) * 1000) / 1000;
    }
  }
  return { plates: used, leftover: Math.round(side * 2 * 100) / 100 };
}

/* ---------- Progresso ---------- */

/** Tudo o que já levantou: peso × repetições das séries de trabalho. */
export function totalLifted(history: LoggedSet[]) {
  return Math.round(working(history).reduce((sum, set) => sum + (set.weight_kg ?? 0) * set.amount, 0));
}

/** Melhor 1RM estimado de cada exercício com carga. */
export function bestLifts(history: LoggedSet[]): Map<string, { oneRepMax: number; set: LoggedSet }> {
  const best = new Map<string, { oneRepMax: number; set: LoggedSet }>();
  for (const set of working(history)) {
    if (!set.weight_kg) continue;
    const oneRepMax = estimateOneRepMax(set.weight_kg, set.amount);
    const current = best.get(set.exercise_id);
    if (!current || oneRepMax > current.oneRepMax) best.set(set.exercise_id, { oneRepMax, set });
  }
  return best;
}

/** Grupos treinados ontem ou hoje: ainda se recuperando. */
export function recoveringSlots(history: LoggedSet[], slotOf: (id: string) => Slot | undefined, today: string) {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() - 1);
  const yesterday = dayKey(date);
  const slots = new Set<Slot>();
  for (const set of working(history)) {
    if (set.day >= yesterday && set.day <= today) {
      const slot = slotOf(set.exercise_id);
      if (slot) slots.add(slot);
    }
  }
  return slots;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * As últimas 53 semanas em colunas (segunda a domingo), terminando na semana
 * de hoje. Dias depois de hoje vêm como null.
 */
export function yearWeeks(today: string): (string | null)[][] {
  const end = new Date(`${today}T12:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 52 * 7);
  const weeks: (string | null)[][] = [];
  const cursor = new Date(start);
  for (let week = 0; week < 53; week += 1) {
    const column: (string | null)[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const key = dayKey(cursor);
      column.push(key > today ? null : key);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(column);
  }
  return weeks;
}

/* ---------- Rodízio ---------- */

/** No rodízio, o treino de um dia é o seguinte ao último feito antes dele. */
export function rotationKey(keys: string[], doneBefore: { day: string; session: string }[], day: string): string | null {
  if (!keys.length) return null;
  const earlier = doneBefore.filter((log) => log.day < day).sort((a, b) => a.day.localeCompare(b.day));
  const last = earlier[earlier.length - 1];
  const index = last ? keys.indexOf(last.session) : -1;
  return keys[(index + 1) % keys.length] ?? null;
}

/* ---------- Importar e exportar ---------- */

export interface ImportedSet {
  day: string;
  name: string;
  set_number: number;
  amount: number;
  weight_kg: number | null;
  kind: SetKind;
  rir: number | null;
}

/** Lê CSV com aspas, vírgulas e quebras de linha dentro dos campos. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^﻿/, "");
  const delimiter = (source.split("\n", 1)[0] ?? "").split(";").length > (source.split("\n", 1)[0] ?? "").split(",").length ? ";" : ",";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12 };

/** "2026-11-23 10:00:00", "23 Nov 2026, 10:00" ou "23/11/2026" → "2026-11-23". */
export function parseDay(value: string): string | null {
  const text = value.trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = /^(\d{1,2})\s+([A-Za-zç]{3})[a-zç]*\.?\s+(\d{4})/i.exec(text);
  if (match) {
    const month = MONTHS[match[2]!.toLowerCase()];
    if (month) return `${match[3]}-${String(month).padStart(2, "0")}-${match[1]!.padStart(2, "0")}`;
  }
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text);
  if (match) return `${match[3]}-${match[2]!.padStart(2, "0")}-${match[1]!.padStart(2, "0")}`;
  return null;
}

const number = (value: string | undefined) => {
  if (!value?.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

function kindFrom(value: string | undefined): SetKind {
  const text = (value ?? "").trim().toLowerCase();
  if (text === "w" || text.startsWith("warm") || text.startsWith("aquec")) return "warmup";
  if (text === "d" || text.startsWith("drop")) return "drop";
  if (text === "f" || text.startsWith("fail") || text.startsWith("falha")) return "failure";
  return "normal";
}

/**
 * Séries de um CSV do Strong, do Hevy ou do próprio Flowy. Libras viram kg
 * quando a coluna diz "lbs".
 */
export function readWorkoutCsv(text: string): ImportedSet[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const columns = header.map((name) => name.trim().toLowerCase());
  const find = (...names: string[]) => columns.findIndex((column) => names.includes(column));
  const at = {
    day: find("date", "start_time", "data", "dia"),
    name: find("exercise name", "exercise_title", "exercício", "exercicio"),
    set: find("set order", "set_index", "série", "serie"),
    reps: find("reps", "repetições", "repeticoes"),
    seconds: find("seconds", "duration_seconds", "segundos"),
    kg: find("weight", "weight_kg", "peso (kg)", "peso", "kg"),
    lbs: find("weight_lbs"),
    type: find("set_type", "tipo"),
    rpe: find("rpe"),
    rir: find("rir"),
  };
  if (at.day < 0 || at.name < 0) return [];
  const perExerciseDay = new Map<string, number>();
  const result: ImportedSet[] = [];
  for (const row of rows) {
    const day = parseDay(row[at.day] ?? "");
    const name = (row[at.name] ?? "").trim();
    if (!day || !name) continue;
    const setCell = at.set >= 0 ? row[at.set] ?? "" : "";
    const kind = at.type >= 0 ? kindFrom(row[at.type]) : kindFrom(/^[a-z]$/i.test(setCell.trim()) ? setCell : "");
    const amount = number(row[at.reps]) || number(row[at.seconds]);
    if (!amount || amount <= 0) continue;
    let weight = at.kg >= 0 ? number(row[at.kg]) : null;
    if (weight === null && at.lbs >= 0) {
      const pounds = number(row[at.lbs]);
      weight = pounds === null ? null : Math.round(pounds * 0.453592 * 10) / 10;
    }
    const rpe = at.rpe >= 0 ? number(row[at.rpe]) : null;
    const rirCell = at.rir >= 0 ? number(row[at.rir]) : null;
    const rir = rirCell ?? (rpe !== null && rpe >= 5 ? Math.max(0, Math.min(5, Math.round(10 - rpe))) : null);
    const key = `${day}|${name.toLowerCase()}`;
    const setNumber = (perExerciseDay.get(key) ?? 0) + 1;
    perExerciseDay.set(key, setNumber);
    result.push({
      day,
      name,
      set_number: setNumber,
      amount: Math.min(999, Math.round(amount)),
      weight_kg: weight && weight > 0 ? weight : null,
      kind,
      rir,
    });
  }
  return result;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Nomes em inglês (Strong, Hevy) e apelidos comuns → exercício do Flowy. */
const ALIASES: [string, string][] = [
  ["bench press", "barbell-bench-press"],
  ["dumbbell bench press", "dumbbell-bench-press"],
  ["incline bench press", "dumbbell-bench-press"],
  ["supino", "barbell-bench-press"],
  ["squat", "barbell-squat"],
  ["back squat", "barbell-squat"],
  ["goblet squat", "goblet-squat"],
  ["bodyweight squat", "bodyweight-squat"],
  ["air squat", "bodyweight-squat"],
  ["leg press", "leg-press"],
  ["leg extension", "leg-extension"],
  ["extensora", "leg-extension"],
  ["leg curl", "leg-curl"],
  ["lying leg curl", "leg-curl"],
  ["seated leg curl", "leg-curl"],
  ["flexora", "leg-curl"],
  ["deadlift", "deadlift"],
  ["romanian deadlift", "dumbbell-rdl"],
  ["stiff", "dumbbell-rdl"],
  ["hip thrust", "hip-thrust"],
  ["glute bridge", "glute-bridge"],
  ["lunge", "reverse-lunge"],
  ["reverse lunge", "reverse-lunge"],
  ["bulgarian split squat", "bulgarian-split-squat"],
  ["step up", "step-up"],
  ["overhead press", "dumbbell-shoulder-press"],
  ["shoulder press", "dumbbell-shoulder-press"],
  ["military press", "dumbbell-shoulder-press"],
  ["desenvolvimento", "dumbbell-shoulder-press"],
  ["lateral raise", "lateral-raise"],
  ["push up", "push-up"],
  ["incline push up", "incline-push-up"],
  ["pull up", "pull-up"],
  ["chin up", "pull-up"],
  ["lat pulldown", "lat-pulldown"],
  ["pulldown", "lat-pulldown"],
  ["puxada", "lat-pulldown"],
  ["seated cable row", "seated-row"],
  ["seated row", "seated-row"],
  ["cable row", "seated-row"],
  ["bent over row", "bent-over-row"],
  ["barbell row", "bent-over-row"],
  ["dumbbell row", "dumbbell-row"],
  ["bicep curl", "dumbbell-curl"],
  ["biceps curl", "dumbbell-curl"],
  ["dumbbell curl", "dumbbell-curl"],
  ["hammer curl", "dumbbell-curl"],
  ["rosca", "dumbbell-curl"],
  ["triceps pushdown", "triceps-pushdown"],
  ["tricep pushdown", "triceps-pushdown"],
  ["triceps", "triceps-pushdown"],
  ["bench dip", "bench-dip"],
  ["dips", "bench-dip"],
  ["calf raise", "calf-raise"],
  ["standing calf raise", "calf-raise"],
  ["panturrilha", "calf-raise"],
  ["plank", "plank"],
  ["side plank", "side-plank"],
  ["crunch", "crunch"],
  ["abdominal", "crunch"],
  ["mountain climber", "mountain-climber"],
  ["burpee", "burpee"],
  ["jump rope", "jump-rope"],
  ["running", "easy-run"],
  ["treadmill", "easy-run"],
  ["cycling", "stationary-bike"],
  ["bike", "stationary-bike"],
  ["walking", "brisk-walk"],
];

/**
 * O exercício do Flowy para um nome importado: nome igual, depois o apelido
 * mais longo contido no nome ("Bench Press (Barbell)" → supino com barra).
 */
export function matchExercise(name: string, catalog: { id: string; name: string }[]): string | null {
  const wanted = normalize(name);
  if (!wanted) return null;
  const exact = catalog.find((exercise) => normalize(exercise.name) === wanted || exercise.id === wanted.replace(/ /g, "-"));
  if (exact) return exact.id;
  const alias = ALIASES.filter(([words]) => ` ${wanted} `.includes(` ${words} `)).sort((a, b) => b[0].length - a[0].length)[0];
  return alias?.[1] ?? null;
}

const csvCell = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** As séries num CSV que abre em planilha (e que o Flowy importa de volta). */
export function setsToCsv(sets: LoggedSet[], nameOf: (id: string) => string): string {
  const header = ["data", "exercicio", "serie", "repeticoes", "peso (kg)", "tipo", "rir"];
  const rows = [...sets]
    .sort((a, b) => a.day.localeCompare(b.day) || a.exercise_id.localeCompare(b.exercise_id) || a.set_number - b.set_number)
    .map((set) =>
      [set.day, nameOf(set.exercise_id), set.set_number, set.amount, set.weight_kg, set.kind ?? "normal", set.rir ?? null]
        .map(csvCell)
        .join(","),
    );
  return [header.join(","), ...rows].join("\n");
}
