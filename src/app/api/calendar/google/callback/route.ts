import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { googleCalendarConfig } from "@/lib/calendar/google";
import { serviceClient } from "@/lib/supabase/admin";
import { publicOrigin } from "@/lib/request-origin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sameState(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Google sends the person back here; the refresh token is kept server-side. */
export async function GET(request: NextRequest) {
  const origin = publicOrigin(request);
  const back = (result: string) => {
    const response = NextResponse.redirect(`${origin}/app/settings?agenda=${result}#agenda`);
    response.cookies.delete({ name: "flowy_gcal_state", path: "/api/calendar/google" });
    return response;
  };

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state") ?? "";
  const expected = request.cookies.get("flowy_gcal_state")?.value ?? "";
  if (params.get("error") || !code) return back("cancelado");
  if (!expected || !sameState(state, expected)) return back("erro");

  const config = googleCalendarConfig();
  const admin = serviceClient();
  if (!config || !admin) return back("indisponivel");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/app/settings`);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: `${origin}/api/calendar/google/callback`,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  const tokens = (await tokenResponse.json().catch(() => ({}))) as {
    refresh_token?: string;
    scope?: string;
    id_token?: string;
  };
  // The person may have unticked the calendar box on Google's screen.
  if (!tokens.refresh_token || !tokens.scope?.includes("calendar")) return back("sem-permissao");

  let email: string | null = null;
  try {
    const payload = JSON.parse(Buffer.from(tokens.id_token?.split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: string };
    email = payload.email ?? null;
  } catch {
    email = null;
  }

  const { error } = await admin
    .from("calendar_connections")
    .upsert({ user_id: user.id, provider: "google", refresh_token: tokens.refresh_token, account_email: email });
  if (error) {
    console.error("Google Agenda: falha ao salvar.", error.message);
    return back("erro");
  }
  return back("conectada");
}
