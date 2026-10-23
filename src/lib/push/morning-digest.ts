import type { PushPayload } from "@/lib/push/web-push";

export interface MorningDigest {
  today_count: number;
  overdue_count: number;
  titles: string[] | null;
}

function count(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function shorten(title: string, max = 40) {
  return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title;
}

/**
 * Text of the 8:00 push: today's count in the title, overdue tasks and the
 * first titles in the body. `null` when there is nothing to do, so a free day
 * does not cost a notification.
 */
export function buildMorningDigest(digest: MorningDigest): PushPayload | null {
  const { today_count: today, overdue_count: overdue } = digest;
  if (today <= 0 && overdue <= 0) return null;

  const titles = (digest.titles ?? []).map((title) => shorten(title));
  const remaining = today + overdue - titles.length;
  const parts: string[] = [];
  if (overdue > 0) parts.push(`⚠️ ${count(overdue, "atrasada", "atrasadas")}`);
  if (titles.length > 0) {
    parts.push(`${titles.join(", ")}${remaining > 0 ? ` e mais ${remaining}` : ""}`);
  }

  return {
    title:
      today > 0
        ? `☀️ Bom dia! ${count(today, "tarefa", "tarefas")} para hoje`
        : "☀️ Bom dia! Hora de colocar o atrasado em dia",
    body: parts.join(" · "),
    url: "/app?view=today",
    tag: "morning-digest",
  };
}
