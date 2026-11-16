import type { Task } from "@/types/productivity";

type DatedTask = Pick<Task, "id" | "title" | "status" | "due_date" | "deleted_at">;

const pad = (value: number) => String(value).padStart(2, "0");
export const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function parse(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year!, month! - 1, date!);
}

export function daysBetween(from: string, to: string) {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / 86_400_000);
}

function addDays(day: string, days: number) {
  const date = parse(day);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

// Words that make a task a test or a deadline worth counting down to.
const DEADLINE = /\b(provas?|exames?|testes?|simulados?|entregas?|trabalhos?|semin[aá]rios?|apresenta[cç](?:[aã]o|[oõ]es)|tcc|avalia[cç](?:[aã]o|[oõ]es)|p[1-4]|ap[1-4]|av[1-4]|vestibular|enem|concurso|defesa)\b/i;
export const STUDY_PREFIX = "Estudar: ";
/** Older plans were titled with a book emoji first. */
const OLD_STUDY_PREFIX = "📚 Estudar: ";

export function isDeadline(title: string) {
  return !title.startsWith(STUDY_PREFIX) && !title.startsWith(OLD_STUDY_PREFIX) && DEADLINE.test(title);
}

export interface Countdown<T> {
  task: T;
  days: number;
}

/** Tests and deadlines of the next three weeks, closest first. */
export function countdowns<T extends DatedTask>(tasks: T[], today: string, horizon = 21): Countdown<T>[] {
  const seen = new Set<string>();
  return tasks
    .filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return !task.deleted_at && task.status !== "completed" && task.due_date && isDeadline(task.title);
    })
    .map((task) => ({ task, days: daysBetween(today, task.due_date!) }))
    .filter(({ days }) => days >= 0 && days <= horizon)
    .sort((a, b) => a.days - b.days);
}

export function countdownLabel(days: number) {
  if (days === 0) return "é hoje!";
  if (days === 1) return "é amanhã";
  return `em ${days} dias`;
}

/**
 * Study sessions spread over the days left before the test: up to five,
 * from today to the day before, evenly apart.
 */
export function studyPlan(title: string, today: string, dueDate: string): { title: string; due_date: string }[] {
  const days = daysBetween(today, dueDate);
  if (days < 1) return [];
  const sessions = Math.min(days, 5);
  return Array.from({ length: sessions }, (_, index) => {
    const offset = Math.floor((index * days) / sessions);
    return {
      title: `${STUDY_PREFIX}${title}${sessions > 1 ? ` (${index + 1}/${sessions})` : ""}`,
      due_date: addDays(today, offset),
    };
  });
}

export function hasStudyPlan(title: string, tasks: Pick<Task, "title" | "deleted_at">[]) {
  return tasks.some((task) => !task.deleted_at && (task.title.startsWith(`${STUDY_PREFIX}${title}`) || task.title.startsWith(`${OLD_STUDY_PREFIX}${title}`)));
}

export type StreakStatus = "lit" | "waiting" | "frozen" | "none";

/**
 * The streak of days with at least one task done.
 * - lit: something done today.
 * - waiting: done yesterday, today still open (not lost in the morning).
 * - frozen: yesterday was missed; doing a task today brings it back.
 * One missed day never breaks it (that day just does not count); two missed
 * days in a row do.
 */
export function streakState(doneDays: string[], today: string): { count: number; status: StreakStatus } {
  const days = new Set(doneDays);
  const yesterday = addDays(today, -1);
  const before = addDays(today, -2);
  const status: StreakStatus = days.has(today) ? "lit" : days.has(yesterday) ? "waiting" : days.has(before) ? "frozen" : "none";
  if (status === "none") return { count: 0, status };
  let cursor = status === "lit" ? today : status === "waiting" ? yesterday : before;
  let count = 0;
  for (;;) {
    if (days.has(cursor)) {
      count += 1;
      cursor = addDays(cursor, -1);
    } else if (days.has(addDays(cursor, -1))) {
      cursor = addDays(cursor, -1); // a single missed day: skipped, not lost
    } else break;
  }
  return { count, status };
}

/** Just the number (see streakState). */
export function streak(doneDays: string[], today: string): number {
  return streakState(doneDays, today).count;
}

