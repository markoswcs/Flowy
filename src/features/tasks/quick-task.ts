import { localDateKey } from "@/features/tasks/date-utils";

export interface QuickTask {
  title: string;
  due_date: string | null;
  due_time: string | null;
}

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function strip(text: string, match: RegExpMatchArray) {
  const index = match.index ?? 0;
  return `${text.slice(0, index)} ${text.slice(index + match[0].length)}`;
}

function withoutAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Reads a date and time written in plain Portuguese from a task title, e.g.
 * "Enviar proposta amanhã às 15h" or "Reunião sexta 9h30", and returns the
 * cleaned title with the due date/time it found.
 */
export function parseQuickTask(input: string, now = new Date()): QuickTask {
  let text = ` ${input.trim()} `;
  let dueDate: string | null = null;
  let dueTime: string | null = null;

  // "15h", "9h30", "11:26", optionally followed by a period such as
  // "da noite" or "pm"; a bare number counts only when a period follows it.
  const period = String.raw`(?:\s*(pm|am|(?:da|de)\s+(?:manha|tarde|noite)))`;
  const time =
    withoutAccents(text).match(
      new RegExp(String.raw`\s(?:as\s+|a\s+)?(\d{1,2})(?:[:h](\d{2})|h)${period}?(?=\s)`, "i"),
    ) ??
    withoutAccents(text).match(
      new RegExp(String.raw`\s(?:as\s+|a\s+)?(\d{1,2})()${period}(?=\s)`, "i"),
    );
  // A 12-hour clock time with no period ("11:26" typed at night) may still be
  // meant for later today; resolved once the date is known.
  let ambiguousHours = false;
  if (time) {
    let hours = Number(time[1]);
    const minutes = Number(time[2] || 0);
    const when = time[3]?.toLowerCase().replace(/\s+/g, " ");
    if (when && /pm|tarde|noite/.test(when) && hours < 12) hours += 12;
    if (when && /am|manha/.test(when) && hours === 12) hours = 0;
    // "9h30" is 24-hour notation; only "11:26" copied from a 12-hour clock is ambiguous.
    ambiguousHours = !when && time[0].includes(":") && hours >= 1 && hours <= 12;
    if (hours < 24 && minutes < 60) {
      dueTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      text = strip(text, time);
    } else {
      ambiguousHours = false;
    }
  }

  const relative = withoutAccents(text).match(
    /\s(depois de amanha|amanha|hoje)(?=\s)/i,
  );
  const weekday = withoutAccents(text).match(
    /\s(?:na\s+|no\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?(?=\s)/i,
  );
  const explicit = text.match(/\s(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/);

  if (relative) {
    const word = relative[1]!.toLowerCase();
    const offset = word === "hoje" ? 0 : word === "amanha" ? 1 : 2;
    dueDate = localDateKey(addDays(now, offset));
    text = strip(text, relative);
  } else if (weekday) {
    const target = WEEKDAYS[weekday[1]!.toLowerCase()]!;
    const offset = (target - now.getDay() + 7) % 7 || 7;
    dueDate = localDateKey(addDays(now, offset));
    text = strip(text, weekday);
  } else if (explicit) {
    const day = Number(explicit[1]);
    const month = Number(explicit[2]);
    let year = explicit[3] ? Number(explicit[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    const candidate = new Date(year, month - 1, day);
    if (candidate.getMonth() === month - 1 && candidate.getDate() === day) {
      if (!explicit[3] && localDateKey(candidate) < localDateKey(now)) {
        candidate.setFullYear(year + 1);
      }
      dueDate = localDateKey(candidate);
      text = strip(text, explicit);
    }
  }

  if (dueTime && !dueDate) dueDate = localDateKey(now);

  // "11:26" written at 23:25 means 23:26, not a morning that already passed.
  if (dueTime && ambiguousHours && dueDate === localDateKey(now)) {
    const [hours, minutes] = dueTime.split(":").map(Number) as [number, number];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const later = (hours % 12) + 12;
    if (hours * 60 + minutes < nowMinutes - 1 && later * 60 + minutes >= nowMinutes - 1) {
      dueTime = `${String(later).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
  }

  const title = text.replace(/\s+/g, " ").trim();
  return {
    title: title || input.trim(),
    due_date: dueDate,
    due_time: dueTime,
  };
}
