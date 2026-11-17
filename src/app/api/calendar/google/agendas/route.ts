import { NextResponse } from "next/server";

import { GoogleRevokedError, googleAccessToken, googleAgendas } from "@/lib/calendar/google";
import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The person's Google agendas, and which ones Flowy shows. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  const admin = serviceClient();
  if (!admin) return NextResponse.json({ agendas: [], chosen: null });

  const { data } = await admin.from("calendar_connections").select("refresh_token").eq("user_id", user.id).maybeSingle();
  if (!data?.refresh_token) return NextResponse.json({ agendas: [], chosen: null });

  try {
    const agendas = await googleAgendas(await googleAccessToken(data.refresh_token));
    const picked = user.user_metadata?.google_agendas;
    const chosen = Array.isArray(picked) ? picked.filter((id): id is string => typeof id === "string") : null;
    return NextResponse.json({ agendas, chosen });
  } catch (error) {
    if (error instanceof GoogleRevokedError) await admin.from("calendar_connections").delete().eq("user_id", user.id);
    console.error("Google Agenda: falha ao listar agendas.", error instanceof Error ? error.message : error);
    return NextResponse.json({ agendas: [], chosen: null, error: "Não foi possível listar suas agendas agora." });
  }
}
