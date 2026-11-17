import { NextResponse, type NextRequest } from "next/server";

import { googleAccessToken, googleCalendarConfig, hasTasksScope } from "@/lib/calendar/google";
import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether the direct Google connection is offered, and the accounts the person added. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const admin = serviceClient();
  const available = Boolean(googleCalendarConfig() && admin);
  if (!available || !admin) return NextResponse.json({ available: false, connected: false, accounts: [] });

  const { data } = await admin
    .from("calendar_connections")
    .select("account_email, refresh_token")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const accounts = await Promise.all(
    (data ?? []).map(async (row) => ({
      email: row.account_email as string | null,
      // Accounts added before Tarefas existed need one more consent.
      tasks: await googleAccessToken(row.refresh_token).then(hasTasksScope).catch(() => true),
    })),
  );
  return NextResponse.json({
    available: true,
    connected: accounts.length > 0,
    accounts,
    email: accounts[0]?.email ?? null,
    tasks: accounts.every((account) => account.tasks),
  });
}

/** Disconnects one account (?email=...): revokes Google's token and forgets it. */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  const admin = serviceClient();
  if (!admin) return NextResponse.json({ ok: true });

  const email = request.nextUrl.searchParams.get("email");
  let query = admin.from("calendar_connections").select("account_email, refresh_token").eq("user_id", user.id);
  if (email) query = query.eq("account_email", email);
  const { data } = await query;
  for (const row of data ?? []) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(row.refresh_token)}`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
    }).catch(() => undefined);
  }
  let remove = admin.from("calendar_connections").delete().eq("user_id", user.id);
  if (email) remove = remove.eq("account_email", email);
  await remove;
  return NextResponse.json({ ok: true });
}
