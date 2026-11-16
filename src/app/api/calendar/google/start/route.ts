import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { GOOGLE_CALENDAR_SCOPE, googleCalendarConfig } from "@/lib/calendar/google";
import { publicOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Conectar Google Agenda": sends the signed-in person to Google's consent screen. */
export async function GET(request: NextRequest) {
  const origin = publicOrigin(request);
  // Google only knows the current address: an app installed from the old one
  // starts over there, so the return address matches.
  if (origin === "https://flowy-mauve.vercel.app") {
    return NextResponse.redirect("https://useflowy.vercel.app/api/calendar/google/start");
  }
  const config = googleCalendarConfig();
  if (!config) return NextResponse.redirect(`${origin}/app/settings?agenda=indisponivel#agenda`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/app/settings`);

  const state = randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: `${origin}/api/calendar/google/callback`,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  if (user.email) params.set("login_hint", user.email);

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  // The callback checks this, so nobody can attach their calendar to someone else.
  response.cookies.set("flowy_gcal_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/calendar/google",
    maxAge: 600,
  });
  return response;
}
