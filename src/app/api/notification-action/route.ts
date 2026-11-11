import { NextResponse, type NextRequest } from "next/server";

import { changeFor, isNotificationAction, wallClock } from "@/lib/push/notification-action";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Buttons under a task reminder, called by the service worker with the
 * person's session cookie: row level security keeps it to their own tasks.
 * Answers { open: true } when the app has to be opened instead.
 */
export async function POST(request: NextRequest) {
  // Only the app itself (its service worker) may press these buttons.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { taskId?: unknown; action?: unknown } | null;
  const taskId = typeof body?.taskId === "string" ? body.taskId : null;
  if (!taskId || !isNotificationAction(body?.action)) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Entre de novo." }, { status: 401 });

  const [{ data: task }, { data: preferences }] = await Promise.all([
    supabase
      .from("tasks")
      .select("due_date, due_time, recurrence")
      .eq("id", taskId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase.from("user_preferences").select("timezone").eq("user_id", userId).maybeSingle(),
  ]);
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });

  const now = new Date();
  const change = changeFor(body.action, task, wallClock(preferences?.timezone ?? "America/Sao_Paulo", now), now.toISOString());
  if (change.kind === "open") return NextResponse.json({ open: true });

  const { error } = await supabase
    .from("tasks")
    .update({ ...change.values, updated_at: now.toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
