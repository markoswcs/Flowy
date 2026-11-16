/**
 * A small iCalendar (.ics) reader for the calendar link Google, Outlook and
 * iCloud give out: events, all-day events and the usual repeat rules.
 */

export interface CalendarEvent {
  date: string; // YYYY-MM-DD in the viewer's timezone
  time: string | null; // HH:MM, null for all day
  title: string;
}

interface Stamp {
  /** Wall-clock parts as written in the file. */
  y: number;
  m: number;
  d: number;
  h: number;
  min: number;
  allDay: boolean;
  utc: boolean;
  tzid: string | null;
}

interface RawEvent {
  uid: string;
  title: string;
  start: Stamp;
  rrule: Record<string, string> | null;
  exdates: Set<string>;
  recurrenceId: string | null;
  cancelled: boolean;
}

/** Hosts whose calendar links Flowy reads (no others, so it is no open proxy). */
const HOSTS = [/^calendar\.google\.com$/, /^outlook\.(office365|office|live)\.com$/, /^p\d+-caldav\.icloud\.com$/, /(^|\.)icloud\.com$/];

/** Checks a pasted calendar link; webcal:// becomes https://. */
export function normalizeFeedUrl(raw: string): string | null {
  const text = raw.trim().replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (!HOSTS.some((host) => host.test(url.hostname))) return null;
  return url.toString();
}

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescape(value: string) {
  return value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

function parseStamp(params: string, value: string): Stamp | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(value.trim());
  if (!match) return null;
  const tzid = /TZID=([^;:]+)/i.exec(params)?.[1]?.replace(/^"|"$/g, "") ?? null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
    h: Number(match[4] ?? 0),
    min: Number(match[5] ?? 0),
    allDay: !match[4] || /VALUE=DATE(?!-)/i.test(params),
    utc: Boolean(match[7]),
    tzid,
  };
}

const key = (stamp: Pick<Stamp, "y" | "m" | "d">) =>
  `${stamp.y}-${String(stamp.m).padStart(2, "0")}-${String(stamp.d).padStart(2, "0")}`;

export function parseIcs(text: string): RawEvent[] {
  const events: RawEvent[] = [];
  let current: Partial<RawEvent> | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      current = { exdates: new Set(), rrule: null, recurrenceId: null, cancelled: false, title: "", uid: "" };
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.start) events.push(current as RawEvent);
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const head = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [name, ...rest] = head.split(";");
    const params = rest.join(";");
    switch (name?.toUpperCase()) {
      case "UID":
        current.uid = value.trim();
        break;
      case "SUMMARY":
        current.title = unescape(value).slice(0, 200);
        break;
      case "DTSTART":
        current.start = parseStamp(params, value) ?? undefined;
        break;
      case "RRULE":
        current.rrule = Object.fromEntries(value.split(";").map((part) => part.split("=") as [string, string]));
        break;
      case "EXDATE":
        for (const item of value.split(",")) {
          const stamp = parseStamp(params, item);
          if (stamp) current.exdates!.add(key(stamp));
        }
        break;
      case "RECURRENCE-ID": {
        const stamp = parseStamp(params, value);
        current.recurrenceId = stamp ? key(stamp) : null;
        break;
      }
      case "STATUS":
        current.cancelled = value.trim().toUpperCase() === "CANCELLED";
        break;
    }
  }
  return events;
}

/** Offset (minutes) of a timezone at a UTC instant. */
function offsetAt(timeZone: string, utcMs: number) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(utcMs));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return (asUtc - utcMs) / 60000;
  } catch {
    return 0;
  }
}

/** A start moved to the viewer's timezone (all-day and floating stay as written). */
function localize(stamp: Stamp, viewerZone: string): { date: string; time: string | null } {
  if (stamp.allDay) return { date: key(stamp), time: null };
  if (!stamp.utc && (!stamp.tzid || stamp.tzid === viewerZone)) {
    return { date: key(stamp), time: `${String(stamp.h).padStart(2, "0")}:${String(stamp.min).padStart(2, "0")}` };
  }
  const wall = Date.UTC(stamp.y, stamp.m - 1, stamp.d, stamp.h, stamp.min);
  const utc = stamp.utc ? wall : wall - offsetAt(stamp.tzid!, wall) * 60000;
  const local = new Date(utc + offsetAt(viewerZone, utc) * 60000);
  return {
    date: key({ y: local.getUTCFullYear(), m: local.getUTCMonth() + 1, d: local.getUTCDate() }),
    time: `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`,
  };
}

const DAY = 86_400_000;
const WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** Dates (as written) a repeating event falls on, up to `to`. */
function occurrences(event: RawEvent, to: string): Stamp[] {
  const start = event.start;
  if (!event.rrule) return [start];
  const rule = event.rrule;
  const freq = rule.FREQ;
  const interval = Math.max(1, Number(rule.INTERVAL ?? 1));
  const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const until = rule.UNTIL ? key(parseStamp("", rule.UNTIL)!) : null;
  const byDay = rule.BYDAY?.split(",").map((day) => WEEKDAYS.indexOf(day.slice(-2))).filter((day) => day >= 0);
  const out: Stamp[] = [];
  const base = Date.UTC(start.y, start.m - 1, start.d);
  const push = (ms: number) => {
    const date = new Date(ms);
    out.push({ ...start, y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() });
  };
  for (let step = 0, made = 0; made < count && step < 3000; step++) {
    let candidates: number[] = [];
    if (freq === "DAILY") candidates = [base + step * interval * DAY];
    else if (freq === "WEEKLY") {
      const weekStart = base + step * interval * 7 * DAY;
      const startDay = new Date(base).getUTCDay();
      candidates = (byDay?.length ? byDay : [startDay]).map((day) => weekStart + (day - startDay) * DAY).filter((ms) => ms >= base).sort((a, b) => a - b);
    } else if (freq === "MONTHLY") {
      const date = new Date(Date.UTC(start.y, start.m - 1 + step * interval, start.d));
      if (date.getUTCDate() === start.d) candidates = [date.getTime()];
    } else if (freq === "YEARLY") {
      const date = new Date(Date.UTC(start.y + step * interval, start.m - 1, start.d));
      if (date.getUTCDate() === start.d) candidates = [date.getTime()];
    } else return [start];
    let past = false;
    for (const ms of candidates) {
      const stamp = new Date(ms).toISOString().slice(0, 10);
      if ((until && stamp > until) || stamp > to) {
        past = true;
        break;
      }
      if (made >= count) break;
      push(ms);
      made++;
    }
    if (past) break;
  }
  return out;
}

/** Events between two dates (inclusive), in the viewer's timezone, sorted. */
export function eventsBetween(text: string, from: string, to: string, viewerZone: string): CalendarEvent[] {
  const raw = parseIcs(text).filter((event) => !event.cancelled);
  const moved = new Map<string, Set<string>>();
  for (const event of raw) {
    if (event.recurrenceId) moved.set(event.uid, (moved.get(event.uid) ?? new Set()).add(event.recurrenceId));
  }
  const out: CalendarEvent[] = [];
  for (const event of raw) {
    const skip = event.recurrenceId ? new Set<string>() : (moved.get(event.uid) ?? new Set<string>());
    for (const stamp of occurrences(event, to)) {
      if (event.exdates.has(key(stamp)) || skip.has(key(stamp))) continue;
      const local = localize(stamp, viewerZone);
      if (local.date < from || local.date > to) continue;
      out.push({ ...local, title: event.title || "(sem título)" });
    }
  }
  return out
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
    .slice(0, 500);
}
