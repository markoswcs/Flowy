import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { sendPush, type StoredPushSubscription } from "@/lib/push/web-push";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK = 50;

/**
 * Sends an announcement to everyone: saved for the in-app card and pushed to
 * every device with reminders on. Only accounts in public.app_admins may call
 * it, and at most once a minute.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return NextResponse.json({ error: "Servidor sem chave de serviço." }, { status: 500 });
  const admin = createAdminClient(getSupabaseEnv().url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: isAdmin } = await admin.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!isAdmin) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const input = (await request.json().catch(() => null)) as { title?: unknown; body?: unknown } | null;
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!title || title.length > 80 || !body || body.length > 500) {
    return NextResponse.json({ error: "Título até 80 caracteres e mensagem até 500." }, { status: 400 });
  }

  const { data: last } = await admin
    .from("announcements")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 60_000) {
    return NextResponse.json({ error: "Espere 1 minuto entre um aviso e outro." }, { status: 429 });
  }

  const { error: insertError } = await admin.from("announcements").insert({ title, body, created_by: user.id });
  if (insertError) {
    console.error("Aviso: falha ao salvar.", insertError);
    return NextResponse.json({ error: "Não foi possível salvar o aviso." }, { status: 500 });
  }

  const { data: subscriptions } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth");
  const list = (subscriptions ?? []) as StoredPushSubscription[];
  let sent = 0;
  const expired: string[] = [];
  for (let index = 0; index < list.length; index += CHUNK) {
    const result = await sendPush(list.slice(index, index + CHUNK), {
      title,
      body,
      url: "/app?view=today",
      tag: "flowy-announcement",
    });
    sent += result.sent;
    expired.push(...result.expired);
  }
  if (expired.length) await admin.from("push_subscriptions").delete().in("endpoint", expired);

  return NextResponse.json({ sent, devices: list.length });
}
