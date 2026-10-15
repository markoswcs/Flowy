import { NextResponse } from "next/server";

import { sendPush } from "@/lib/push/web-push";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sends a test notification to every device of the signed-in user. RLS limits the
// query to that user's own subscriptions.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (error) {
    return NextResponse.json({ error: "Falha ao buscar dispositivos." }, { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json(
      { error: "Nenhum dispositivo com notificações ativas." },
      { status: 404 },
    );
  }

  try {
    const result = await sendPush(subscriptions, {
      title: "🔔 Notificações ativas",
      body: "É assim que o Flowy vai te lembrar das tarefas.",
      url: "/app/settings",
      tag: "flowy-test",
    });
    if (result.expired.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", result.expired);
    }
    return NextResponse.json(result);
  } catch (sendError) {
    console.error(sendError);
    return NextResponse.json({ error: "Web Push não configurado no servidor." }, { status: 500 });
  }
}
