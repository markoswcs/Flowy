import { EXERCISE_BY_ID, EXERCISES, type Exercise, type Slot } from "./exercises";
import type { Feeling, WorkoutGoal, WorkoutLevel, WorkoutLog, WorkoutProfile } from "./types";

/**
 * The plan is never stored: it is rebuilt from the profile by these rules, so a
 * change of goal, days, place or a reported pain reshapes it at once, and the
 * feedback after each workout (intensity) and the swaps adjust it over time.
 */

type PlanProfile = Pick<
  WorkoutProfile,
  "goal" | "level" | "days" | "minutes" | "place" | "limitations" | "intensity" | "swaps"
> & { custom_sessions?: WorkoutProfile["custom_sessions"] };

export interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  /** Repetitions, seconds or minutes, as exercise.unit says. */
  amount: number;
  /** Rest between sets, in seconds. */
  rest: number;
}

export interface Session {
  key: string;
  name: string;
  exercises: PlannedExercise[];
  /** The person edited this workout by hand. */
  custom: boolean;
}

const TEMPLATES: Record<string, { name: string; slots: Slot[] }> = {
  full_a: { name: "Corpo todo A", slots: ["squat", "push", "hinge", "pull", "core", "cardio", "lunge", "core"] },
  full_b: { name: "Corpo todo B", slots: ["lunge", "pull", "hinge", "push", "core", "cardio", "squat", "core"] },
  full_c: { name: "Corpo todo C", slots: ["squat", "pull", "push", "lunge", "core", "cardio", "hinge", "core"] },
  upper: { name: "Membros superiores", slots: ["push", "pull", "push", "pull", "core", "core"] },
  lower: { name: "Membros inferiores", slots: ["squat", "hinge", "lunge", "core", "cardio", "hinge"] },
  push: { name: "Peito, ombros e tríceps", slots: ["push", "push", "push", "core", "core"] },
  pull: { name: "Costas e bíceps", slots: ["pull", "pull", "hinge", "pull", "core"] },
  legs: { name: "Pernas", slots: ["squat", "lunge", "hinge", "squat", "core"] },
  cardio: { name: "Cardio e abdômen", slots: ["cardio", "core", "cardio", "core", "cardio", "core"] },
};

const LEVEL_NUMBER: Record<WorkoutLevel, 1 | 2 | 3> = { beginner: 1, intermediate: 2, advanced: 3 };
const BASE_REPS: Record<WorkoutGoal, number> = { gain_muscle: 10, lose_weight: 15, conditioning: 12, health: 12 };
const REST: Record<WorkoutGoal, number> = { gain_muscle: 90, lose_weight: 30, conditioning: 45, health: 60 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Session keys in the order of the training days, e.g. ["upper", "lower", "upper-2"]. */
export function sessionKeys(profile: Pick<PlanProfile, "goal" | "days">): string[] {
  const count = clamp(profile.days.length, 1, 7);
  const muscle = profile.goal === "gain_muscle";
  let order: string[];
  if (count <= 2) order = ["full_a", "full_b"];
  else if (count === 3) order = muscle ? ["upper", "lower", "full_a"] : ["full_a", "full_b", "full_c"];
  else if (count === 4) order = muscle ? ["upper", "lower", "upper", "lower"] : ["full_a", "cardio", "full_b", "cardio"];
  else
    order = muscle
      ? ["push", "pull", "legs", "upper", "lower", "full_a", "cardio"]
      : ["full_a", "cardio", "full_b", "cardio", "full_c", "lower", "cardio"];
  // A template used again in the week gets its own key and other exercises.
  const seen = new Map<string, number>();
  return order.slice(0, count).map((template) => {
    const times = (seen.get(template) ?? 0) + 1;
    seen.set(template, times);
    return times === 1 ? template : `${template}-${times}`;
  });
}

function parseKey(key: string) {
  const [template, variant] = key.split("-");
  return { template: template ?? "full_a", variant: Number(variant ?? 1) - 1 };
}

function allowed(exercise: Exercise, profile: PlanProfile, strictPlace = true) {
  return (
    (!strictPlace || exercise.places.includes(profile.place)) &&
    exercise.level <= LEVEL_NUMBER[profile.level] &&
    !exercise.avoid.some((part) => profile.limitations.includes(part))
  );
}

/** Exercises that can take the place of this one for this person (same movement). */
export function alternativesFor(exercise: Exercise, profile: PlanProfile): Exercise[] {
  return EXERCISES.filter(
    (candidate) => candidate.slot === exercise.slot && candidate.id !== exercise.id && allowed(candidate, profile),
  );
}

function candidatesFor(slot: Slot, profile: PlanProfile) {
  const bySlot = EXERCISES.filter((exercise) => exercise.slot === slot && !exercise.catalogOnly);
  const strict = bySlot.filter((exercise) => allowed(exercise, profile));
  if (strict.length) return strict;
  // Nothing fits the place: any place still respects level and pains.
  return bySlot.filter((exercise) => allowed(exercise, profile, false));
}

/** Sets, amount and rest the plan gives this exercise for this person. */
export function dose(exercise: Exercise, profile: PlanProfile): Omit<PlannedExercise, "exercise"> {
  const level = LEVEL_NUMBER[profile.level];
  const intensity = profile.intensity;
  const rest = REST[profile.goal];
  if (exercise.unit === "minutes") {
    return { sets: 1, amount: clamp(Math.round(profile.minutes * 0.3) + intensity * 2, 5, 45), rest: 0 };
  }
  const sets = clamp(level + 1 + (intensity >= 2 ? 1 : 0) - (intensity <= -1 ? 1 : 0), 1, 5);
  if (exercise.unit === "seconds") {
    return { sets, amount: clamp(20 + 10 * level + 5 * intensity, 15, 90), rest };
  }
  return { sets, amount: clamp(BASE_REPS[profile.goal] + 2 * intensity, 6, 25), rest };
}

/** How many exercises fit the time: about 7 minutes each after a 5-minute warm-up. */
export function exerciseCount(minutes: number, slots: number) {
  return clamp(Math.round((minutes - 5) / 7), 3, slots);
}

export function buildSession(profile: PlanProfile, key: string): Session {
  const { template, variant } = parseKey(key);
  const { name, slots } = TEMPLATES[template] ?? TEMPLATES.full_a!;
  const suffix = variant > 0 ? ` (variação ${variant + 1})` : "";

  // Edited by hand: exactly what the person chose, in their order.
  const custom = profile.custom_sessions?.[key];
  if (custom) {
    const exercises = custom.flatMap(({ id, sets, amount, rest }) => {
      const exercise = EXERCISE_BY_ID.get(id);
      return exercise ? [{ exercise, sets, amount, rest }] : [];
    });
    return { key, name: `${name}${suffix}`, exercises, custom: true };
  }

  const used = new Set<string>();
  const occurrences = new Map<Slot, number>();
  const exercises: PlannedExercise[] = [];

  for (const slot of slots.slice(0, exerciseCount(profile.minutes, slots.length))) {
    const occurrence = occurrences.get(slot) ?? 0;
    occurrences.set(slot, occurrence + 1);
    // Harder options first, so each person gets the most their level allows.
    const candidates = candidatesFor(slot, profile).sort((a, b) => b.level - a.level || a.id.localeCompare(b.id));
    const fresh = candidates.filter((exercise) => !used.has(exercise.id));
    const pool = fresh.length ? fresh : candidates;
    if (!pool.length) continue;
    let exercise = pool[(variant + occurrence) % pool.length]!;
    const swap = EXERCISE_BY_ID.get(profile.swaps[exercise.id] ?? "");
    if (swap && swap.slot === exercise.slot && allowed(swap, profile, false)) exercise = swap;
    used.add(exercise.id);
    exercises.push({ exercise, ...dose(exercise, profile) });
  }

  return { key, name: `${name}${suffix}`, exercises, custom: false };
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

/** The session planned for a day, or null on a rest day. */
export function sessionKeyFor(profile: Pick<PlanProfile, "goal" | "days">, day: string): string | null {
  const days = [...new Set(profile.days)].sort((a, b) => a - b);
  const index = days.indexOf(parseDate(day).getDay());
  if (index < 0) return null;
  const keys = sessionKeys(profile);
  return keys[index % keys.length] ?? null;
}

export type DayStatus = "done" | "skipped" | "missed" | "rest" | "today" | "planned" | "before";

/** What a day looks like on the calendar. Days before the profile existed are "before". */
export function dayStatus(
  profile: Pick<WorkoutProfile, "goal" | "days" | "created_at">,
  logs: Map<string, WorkoutLog>,
  day: string,
  today: string,
): DayStatus {
  const log = logs.get(day);
  if (log) return log.status === "done" ? "done" : "skipped";
  if (day < dateKey(new Date(profile.created_at))) return "before";
  if (!sessionKeyFor(profile, day)) return "rest";
  if (day < today) return "missed";
  return day === today ? "today" : "planned";
}

/** Training days done in a row, ignoring rest days; today only counts once done. */
export function currentStreak(
  profile: Pick<WorkoutProfile, "goal" | "days" | "created_at">,
  logs: Map<string, WorkoutLog>,
  today: string,
): number {
  let streak = 0;
  const cursor = parseDate(today);
  for (let step = 0; step < 400; step += 1) {
    const day = dateKey(cursor);
    const status = dayStatus(profile, logs, day, today);
    if (status === "done") streak += 1;
    else if (status === "before" || status === "missed" || status === "skipped") break;
    // "rest" and today not done yet keep the streak going.
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Feedback after a workout moves the next ones: easier, the same or harder. */
export function nextIntensity(current: number, feeling: Feeling) {
  const change = feeling === "easy" ? 1 : feeling === "hard" ? -1 : 0;
  return clamp(current + change, -2, 4);
}

/** Dates of the current week, Monday first. */
export function weekDays(today: string): string[] {
  const start = parseDate(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return dateKey(day);
  });
}

/** Every date of the month of `today`. */
export function monthDays(today: string): string[] {
  const start = parseDate(today);
  start.setDate(1);
  const days: string[] = [];
  for (const cursor = new Date(start); cursor.getMonth() === start.getMonth(); cursor.setDate(cursor.getDate() + 1)) {
    days.push(dateKey(cursor));
  }
  return days;
}

/** "3 × 12", "3 × 40 s" or "15 min". */
export function formatDose(item: PlannedExercise) {
  if (item.exercise.unit === "minutes") return `${item.amount} min`;
  const amount = item.exercise.unit === "seconds" ? `${item.amount} s` : `${item.amount}`;
  return `${item.sets} × ${amount}`;
}
