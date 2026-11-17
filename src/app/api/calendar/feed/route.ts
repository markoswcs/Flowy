import { NextResponse, type NextRequest } from "next/server";

import { GoogleRevokedError, googleAccessToken, googleEvents, googleTasks } from "@/lib/calendar/google";
import { eventsBetween, normalizeFeedUrl } from "@/lib/calendar/ics";
import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Follows at most 3 redirects, each one checked against the allowed hosts. */
async function download(start: string): Promise<string> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { accept: "text/calendar, text/plain;q=0.8" },
      cache: "no-store",
    });
    if (response.status >= 300 && response.status < 400) {
      const next = normalizeFeedUrl(new URL(response.headers.get("location") ?? "", url).toString());
      if (!next) throw new Error("redirect");
      url = next;
      continue;
    }
    if (!response.ok) throw new Error(`status ${response.status}`);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) throw new Error("too big");
    const text = await response.text();
    if (text.length > MAX_BYTES || !text.includes("BEGIN:VCALENDAR")) throw new Error("not a calendar");
    return text;
  }
  throw new Error("redirects");
}

/**
 * Events of the signed-in person's calendar link (Google, Outlook, iCloud),
 * saved in their account as `calendar_feed_url`, between two dates.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const tz = params.get("tz") || "America/Sao_Paulo";
  if (!DATE.test(from) || !DATE.test(to) || to < from) {
    return NextResponse.json({ error: "Período inválido." }, { status: 400 });
  }

  // Direct Google connections come first: every account the person added.
  const admin = serviceClient();
  const { data: accounts } = admin
    ? await admin.from("calendar_connections").select("account_email, refresh_token").eq("user_id", user.id)
    : { data: null };
  if (admin && accounts?.length) {
    const picked = user.user_metadata?.google_agendas;
    const chosen = Array.isArray(picked) ? picked.filter((id): id is string => typeof id === "string") : null;
    let failed = false;
    let tasksAllowed = true;
    const results = await Promise.all(
      accounts.map(async (account) => {
        try {
          const token = await googleAccessToken(account.refresh_token);
          const [{ events, agendas }, tasks] = await Promise.all([
            googleEvents(token, from, to, tz, chosen),
            // Connected before Tarefas were asked for: no permission yet, no tasks.
            googleTasks(token, from, to).catch(() => null),
          ]);
          if (tasks === null) tasksAllowed = false;
          console.info(`Google Agenda: ${events.length} eventos de ${agendas} agenda(s), ${tasks?.length ?? "sem permissão para"} tarefas.`);
          return [...events, ...(tasks ?? [])];
        } catch (error) {
          if (error instanceof GoogleRevokedError) {
            // Access removed on Google's side: forget that account.
            await admin.from("calendar_connections").delete().eq("user_id", user.id).eq("account_email", account.account_email);
          } else {
            failed = true;
            console.error("Google Agenda: falha ao ler uma conta.", error instanceof Error ? error.message : error);
          }
          return [];
        }
      }),
    );
    const events = results.flat().sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
    return NextResponse.json(
      {
        events,
        connected: true,
        tasksAllowed,
        ...(failed ? { error: "Não foi possível ler uma das suas agendas agora." } : {}),
      },
      { headers: { "cache-control": "private, max-age=120" } },
    );
  }

  const saved = typeof user.user_metadata?.calendar_feed_url === "string" ? user.user_metadata.calendar_feed_url : "";
  const url = saved ? normalizeFeedUrl(saved) : null;
  if (!url) return NextResponse.json({ events: [], connected: false });

  try {
    const events = eventsBetween(await download(url), from, to, tz);
    return NextResponse.json(
      { events, connected: true },
      { headers: { "cache-control": "private, max-age=300" } },
    );
  } catch (error) {
    console.error("Agenda: falha ao ler o link.", error instanceof Error ? error.message : error);
    return NextResponse.json({ events: [], connected: true, error: "Não foi possível ler sua agenda agora." });
  }
}
