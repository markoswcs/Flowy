import { localDateKey } from "@/features/tasks/date-utils";

export interface QuickTask {
  title: string;
  due_date: string | null;
  due_time: string | null;
}

const MONTHS = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// Words that only tie a date or time to the sentence ("até amanhã", "na
// próxima sexta", "no dia 20") and should leave the title together with it.
const LEAD = String.raw`(?:(?:ate|para|pra|em|no|na|de|do|da)\s+)?`;

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
      new RegExp(
        String.raw`\s(?:ate\s+)?(?:as\s+|a\s+)?(\d{1,2})(?:[:h](\d{2})|\s?horas?|h)${period}?(?=[\s,.;!?])`,
        "i",
      ),
    ) ??
    withoutAccents(text).match(
      new RegExp(String.raw`\s(?:ate\s+)?(?:as\s+|a\s+)?(\d{1,2})()${period}(?=[\s,.;!?])`, "i"),
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

  const plain = () => withoutAccents(text);
  const end = String.raw`(?=[\s,.;!?])`;
  const relative = plain().match(
    new RegExp(String.raw`\s${LEAD}(depois de amanha|amanha|hoje)${end}`, "i"),
  );
  const inDays = plain().match(
    new RegExp(String.raw`\s(?:daqui a|em)\s+(\d{1,2}|uma?|duas|dois|tres)\s+(dias?|semanas?)${end}`, "i"),
  );
  const nextWeek = plain().match(
    new RegExp(String.raw`\s${LEAD}(?:(?:a|na)\s+)?(?:semana que vem|proxima semana)${end}`, "i"),
  );
  const weekday = plain().match(
    new RegExp(
      String.raw`\s${LEAD}(?:(?:a|o|esta|este|essa|esse|nesta|neste|nessa|nesse|proxima|proximo)\s+)?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?${end}`,
      "i",
    ),
  );
  const explicit = plain().match(
    new RegExp(String.raw`\s${LEAD}(?:o\s+)?(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?${end}`, "i"),
  );
  const named = plain().match(
    new RegExp(
      String.raw`\s${LEAD}(?:o\s+)?(?:dia\s+)?(\d{1,2})\s+de\s+(${MONTHS.join("|")})(?:\s+de\s+(\d{4}))?${end}`,
      "i",
    ),
  );
  const dayOnly = plain().match(new RegExp(String.raw`\s${LEAD}(?:o\s+)?dia\s+(\d{1,2})${end}`, "i"));

  if (relative) {
    const word = relative[1]!.toLowerCase();
    const offset = word === "hoje" ? 0 : word === "amanha" ? 1 : 2;
    dueDate = localDateKey(addDays(now, offset));
    text = strip(text, relative);
  } else if (inDays) {
    const words: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3 };
    const amount = words[inDays[1]!.toLowerCase()] ?? Number(inDays[1]);
    const unit = inDays[2]!.toLowerCase().startsWith("semana") ? 7 : 1;
    dueDate = localDateKey(addDays(now, amount * unit));
    text = strip(text, inDays);
  } else if (nextWeek) {
    // Next Monday: the start of the coming week.
    dueDate = localDateKey(addDays(now, (1 - now.getDay() + 7) % 7 || 7));
    text = strip(text, nextWeek);
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
  } else if (named) {
    const day = Number(named[1]);
    const month = MONTHS.indexOf(named[2]!.toLowerCase());
    const year = named[3] ? Number(named[3]) : now.getFullYear();
    const candidate = new Date(year, month, day);
    if (candidate.getDate() === day) {
      if (!named[3] && localDateKey(candidate) < localDateKey(now)) candidate.setFullYear(year + 1);
      dueDate = localDateKey(candidate);
      text = strip(text, named);
    }
  } else if (dayOnly) {
    // "dia 25": this month, or next month once it has passed.
    const day = Number(dayOnly[1]);
    const candidate = new Date(now.getFullYear(), now.getMonth(), day);
    if (localDateKey(candidate) < localDateKey(now)) candidate.setMonth(candidate.getMonth() + 1);
    if (day >= 1 && day <= 31 && candidate.getDate() === day) {
      dueDate = localDateKey(candidate);
      text = strip(text, dayOnly);
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
