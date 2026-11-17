import { NextResponse } from "next/server";

import { GoogleRevokedError, googleAccessToken, googleAgendas, type GoogleAgenda } from "@/lib/calendar/google";
import { serviceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The agendas of every Google account the person added, and which ones Flowy shows. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  const admin = serviceClient();
  if (!admin) return NextResponse.json({ agendas: [], chosen: null });

  const { data } = await admin.from("calendar_connections").select("account_email, refresh_token").eq("user_id", user.id);
  if (!data?.length) return NextResponse.json({ agendas: [], chosen: null });

  let failed = false;
  const lists = await Promise.all(
    data.map(async (row): Promise<(GoogleAgenda & { account: string | null })[]> => {
      try {
        const agendas = await googleAgendas(await googleAccessToken(row.refresh_token));
        return agendas.map((agenda) => ({ ...agenda, account: row.account_email }));
      } catch (error) {
        if (error instanceof GoogleRevokedError) {
          await admin.from("calendar_connections").delete().eq("user_id", user.id).eq("account_email", row.account_email);
        } else {
          failed = true;
          console.error("Google Agenda: falha ao listar agendas.", error instanceof Error ? error.message : error);
        }
        return [];
      }
    }),
  );
  const picked = user.user_metadata?.google_agendas;
  const chosen = Array.isArray(picked) ? picked.filter((id): id is string => typeof id === "string") : null;
  return NextResponse.json({
    agendas: lists.flat(),
    chosen,
    ...(failed ? { error: "Não foi possível listar as agendas de uma conta agora." } : {}),
  });
}
