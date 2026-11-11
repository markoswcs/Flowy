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
export const STUDY_PREFIX = "📚 Estudar: ";

export function isDeadline(title: string) {
  return !title.startsWith(STUDY_PREFIX) && DEADLINE.test(title);
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
  return tasks.some((task) => !task.deleted_at && task.title.startsWith(`${STUDY_PREFIX}${title}`));
}

/**
 * Days in a row with at least one task done, up to today. Today only counts
 * once something is done, so the streak is not lost in the morning.
 */
export function streak(completedAt: (string | null)[], today: string): number {
  const days = new Set(
    completedAt.filter((value): value is string => Boolean(value)).map((value) => dayKey(new Date(value))),
  );
  let count = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** A week in a row unlocks the Aurora colors. */
export const AURORA_STREAK = 7;
