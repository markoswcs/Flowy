import type { CalendarEvent } from "./ics";

/**
 * Read-only access to the person's Google Agenda and Google Tarefas (and their
 * e-mail, to show which account).
 */
export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly email";
const TASKS_SCOPE = "https://www.googleapis.com/auth/tasks.readonly";

/** Whether an access token carries the Google Tarefas permission. */
export async function hasTasksScope(accessToken: string): Promise<boolean> {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) return false;
  const data = (await response.json().catch(() => ({}))) as { scope?: string };
  return (data.scope ?? "").split(" ").includes(TASKS_SCOPE);
}

interface GoogleTask {
  title?: string;
  due?: string;
  status?: string;
  deleted?: boolean;
  hidden?: boolean;
}

/**
 * A Google task with a due date. Google keeps only the day (as midnight UTC),
 * so the date is read as written, with no timezone shift.
 */
export function taskToCalendarEvent(task: GoogleTask): CalendarEvent | null {
  if (!task.due || task.deleted || task.status === "completed") return null;
  const date = task.due.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { date, time: null, title: (task.title ?? "").trim().slice(0, 200) || "(sem título)", kind: "task" };
}

/** Open Google Tarefas with a due date between two dates, from every list. */
export async function googleTasks(accessToken: string, from: string, to: string): Promise<CalendarEvent[]> {
  const get = async <T>(path: string): Promise<T> => {
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`tasks ${response.status}`);
    return response.json() as Promise<T>;
  };
  const lists = await get<{ items?: { id: string }[] }>("users/@me/lists?maxResults=20");
  // Every open task (a list rarely has more than 100), filtered here: the
  // counts below tell why a month comes back empty.
  const params = new URLSearchParams({ showCompleted: "false", showHidden: "false", maxResults: "100" });
  let failed = 0;
  const results = await Promise.all(
    (lists.items ?? []).slice(0, 10).map((list) =>
      get<{ items?: GoogleTask[] }>(`lists/${encodeURIComponent(list.id)}/tasks?${params}`).catch((error: unknown) => {
        failed += 1;
        console.error("Google Tarefas: falha numa lista.", error instanceof Error ? error.message : error);
        return { items: [] as GoogleTask[] };
      }),
    ),
  );
  const open = results.flatMap((result) => result.items ?? []).filter((task) => !task.deleted && task.status !== "completed");
  const dated = open.map(taskToCalendarEvent).filter((event): event is CalendarEvent => Boolean(event));
  const inRange = dated.filter((event) => event.date >= from && event.date <= to);
  console.info(
    `Google Tarefas: ${lists.items?.length ?? 0} lista(s), ${open.length} abertas, ${open.length - dated.length} sem data, ${inRange.length} no período, ${failed} lista(s) com erro.`,
  );
  return inRange;
}

export function googleCalendarConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export class GoogleRevokedError extends Error {}

/** A fresh access token from the stored refresh token. */
export async function googleAccessToken(refreshToken: string): Promise<string> {
  const config = googleCalendarConfig();
  if (!config) throw new Error("Google Agenda não configurado.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (data.error === "invalid_grant") throw new GoogleRevokedError("revoked");
  if (!response.ok || !data.access_token) throw new Error(`token ${response.status}`);
  return data.access_token;
}

interface GoogleEvent {
  status?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string };
}

/** Google's start ("2026-11-16" or "2026-11-16T10:00:00-03:00") in the viewer's timezone. */
export function toCalendarEvent(event: GoogleEvent, viewerZone: string): CalendarEvent | null {
  if (event.status === "cancelled" || !event.start) return null;
  const title = (event.summary ?? "").trim().slice(0, 200) || "(sem título)";
  if (event.start.date) return { date: event.start.date, time: null, title };
  if (!event.start.dateTime) return null;
  const instant = new Date(event.start.dateTime);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: viewerZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, title };
}

interface GoogleCalendarEntry {
  id: string;
  summary?: string;
  summaryOverride?: string;
  backgroundColor?: string;
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
}

export interface GoogleAgenda {
  id: string;
  name: string;
  color: string | null;
  primary: boolean;
}

async function googleGet<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${path.split("?")[0]} ${response.status} ${detail.slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

/** The person's agendas (holiday ones left out: Flowy already shows holidays). */
export async function googleAgendas(accessToken: string): Promise<GoogleAgenda[]> {
  const list = await googleGet<{ items?: GoogleCalendarEntry[] }>(accessToken, "users/me/calendarList?minAccessRole=reader&maxResults=50");
  return (list.items ?? [])
    .filter((item) => !item.id.includes("#holiday@"))
    .map((item) => ({
      id: item.id,
      name: (item.summaryOverride || item.summary || item.id).slice(0, 80),
      color: item.backgroundColor ?? null,
      primary: Boolean(item.primary),
    }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name));
}

/**
 * Which agendas to read: the ones the person chose in Configurações, or only
 * the main one until they choose (shared and subscribed agendas surprise people).
 */
export function agendasToRead(agendas: Pick<GoogleAgenda, "id" | "primary">[], chosen: string[] | null): string[] {
  // The choice covers every connected account; an account with none of its
  // agendas chosen (a newly added one) shows its main agenda.
  const picked = chosen ? agendas.filter((agenda) => chosen.includes(agenda.id)).map((agenda) => agenda.id) : [];
  const ids = picked.length ? picked : agendas.filter((agenda) => agenda.primary).map((agenda) => agenda.id);
  return ids.length ? ids.slice(0, 10) : ["primary"];
}

/** Events of the person's agendas between two dates (inclusive), sorted, without repeats. */
export async function googleEvents(
  accessToken: string,
  from: string,
  to: string,
  viewerZone: string,
  chosen: string[] | null,
): Promise<{ events: CalendarEvent[]; agendas: number }> {
  const all = await googleAgendas(accessToken);
  const agendas = agendasToRead(all, chosen);
  const params = new URLSearchParams({
    timeMin: new Date(`${from}T00:00:00Z`).toISOString(),
    timeMax: new Date(new Date(`${to}T00:00:00Z`).getTime() + 2 * 86_400_000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
    timeZone: viewerZone,
  });
  // Google may split even a short answer into pages: follow them all.
  const read = async (id: string) => {
    const items: GoogleEvent[] = [];
    let pageToken: string | undefined;
    let pages = 0;
    do {
      const query = new URLSearchParams(params);
      if (pageToken) query.set("pageToken", pageToken);
      const page = await googleGet<{ items?: GoogleEvent[]; nextPageToken?: string }>(
        accessToken,
        `calendars/${encodeURIComponent(id)}/events?${query}`,
      );
      items.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
      pages += 1;
    } while (pageToken && pages < 10);
    console.info(`Google Agenda: ${items.length} itens em ${pages} página(s) da agenda ${id === "primary" ? "principal" : id.slice(0, 6)}…`);
    return { items };
  };
  const results = await Promise.all(
    agendas.map((id) =>
      read(id).catch((error: unknown) => {
        console.error(`Google Agenda: falha ao ler a agenda ${id}.`, error instanceof Error ? error.message : error);
        return { items: [] as GoogleEvent[] };
      }),
    ),
  );
  // Nothing found: say, per agenda of the account, how many events this
  // period has, so a missing meeting can be traced to its agenda.
  if (!results.some((result) => result.items?.length)) {
    const counts = await Promise.all(
      all.slice(0, 12).map((agenda) =>
        read(agenda.id)
          .then((result) => `${agenda.name}${agenda.primary ? " (principal)" : ""}: ${result.items?.length ?? 0}`)
          .catch((error: unknown) => `${agenda.name}: erro ${error instanceof Error ? error.message.slice(0, 80) : ""}`),
      ),
    );
    console.info(`Google Agenda: nada lido nas escolhidas (${agendas.join(", ")}). Por agenda: ${counts.join(" | ")}`);
  }
  const seen = new Set<string>();
  const raw = results.flatMap((result) => result.items ?? []);
  // What Google sent before Flowy's own filtering (no titles): status and start shape.
  console.info(
    `Google Agenda: ${raw.length} itens recebidos. Amostra: ${raw
      .slice(0, 5)
      .map((item) => `${item.status ?? "?"}/${item.start?.dateTime ?? item.start?.date ?? "sem início"}`)
      .join(", ")}`,
  );
  const events = raw
    .map((event) => toCalendarEvent(event, viewerZone))
    .filter((event): event is CalendarEvent => {
      if (!event || event.date < from || event.date > to) return false;
      const key = `${event.date}|${event.time}|${event.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
  return { events, agendas: agendas.length };
}
