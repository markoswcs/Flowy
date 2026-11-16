import { NextResponse } from "next/server";

import { googleCalendarConfig } from "@/lib/calendar/google";
import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether the direct Google connection is offered here, and the person's state. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const admin = serviceClient();
  const available = Boolean(googleCalendarConfig() && admin);
  if (!available || !admin) return NextResponse.json({ available: false, connected: false });

  const { data } = await admin.from("calendar_connections").select("account_email").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ available: true, connected: Boolean(data), email: data?.account_email ?? null });
}

/** Disconnects: revokes Google's token and forgets it. */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  const admin = serviceClient();
  if (!admin) return NextResponse.json({ ok: true });

  const { data } = await admin.from("calendar_connections").select("refresh_token").eq("user_id", user.id).maybeSingle();
  if (data?.refresh_token) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(data.refresh_token)}`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
    }).catch(() => undefined);
  }
  await admin.from("calendar_connections").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
