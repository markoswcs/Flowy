import type { CalendarEvent } from "./ics";

/** Read-only access to the person's Google Agenda (and their e-mail, to show which account). */
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly email";

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
  primary?: boolean;
  selected?: boolean;
  hidden?: boolean;
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

/**
 * The agendas the person shows in Google Agenda (the main one and any other
 * they keep checked), not holiday agendas: Flowy already shows holidays.
 */
export function agendasToRead(items: GoogleCalendarEntry[]): string[] {
  const ids = items
    .filter((item) => (item.primary || item.selected) && !item.hidden && !item.id.includes("#holiday@"))
    .map((item) => item.id);
  return ids.length ? ids.slice(0, 10) : ["primary"];
}

/** Events of the person's agendas between two dates (inclusive), sorted, without repeats. */
export async function googleEvents(accessToken: string, from: string, to: string, viewerZone: string): Promise<{ events: CalendarEvent[]; agendas: number }> {
  const list = await googleGet<{ items?: GoogleCalendarEntry[] }>(accessToken, "users/me/calendarList?minAccessRole=reader&maxResults=50");
  const agendas = agendasToRead(list.items ?? []);
  const params = new URLSearchParams({
    timeMin: new Date(`${from}T00:00:00Z`).toISOString(),
    timeMax: new Date(new Date(`${to}T00:00:00Z`).getTime() + 2 * 86_400_000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
    timeZone: viewerZone,
  });
  const results = await Promise.all(
    agendas.map((id) =>
      googleGet<{ items?: GoogleEvent[] }>(accessToken, `calendars/${encodeURIComponent(id)}/events?${params}`).catch(() => ({ items: [] })),
    ),
  );
  const seen = new Set<string>();
  const events = results
    .flatMap((result) => result.items ?? [])
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
