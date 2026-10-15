import { timingSafeEqual } from "node:crypto";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { sendPush, type StoredPushSubscription } from "@/lib/push/web-push";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DueReminder {
  task_id: string;
  user_id: string;
  title: string;
  due_time: string;
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Called every minute by the pg_cron job `flowy-task-reminders` (see supabase/README.md).
async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada." },
      { status: 500 },
    );
  }

  const { url } = getSupabaseEnv();
  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: reminders, error } = await admin.rpc("claim_due_task_reminders");
  if (error) {
    console.error("Falha ao buscar lembretes.", error);
    return NextResponse.json({ error: "Falha ao buscar lembretes." }, { status: 500 });
  }

  const due = (reminders ?? []) as DueReminder[];
  if (due.length === 0) return NextResponse.json({ reminders: 0, sent: 0 });

  const userIds = [...new Set(due.map((reminder) => reminder.user_id))];
  const { data: subscriptions, error: subscriptionsError } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subscriptionsError) {
    console.error("Falha ao buscar inscrições push.", subscriptionsError);
    return NextResponse.json({ error: "Falha ao buscar inscrições." }, { status: 500 });
  }

  const byUser = new Map<string, StoredPushSubscription[]>();
  for (const subscription of subscriptions ?? []) {
    const list = byUser.get(subscription.user_id) ?? [];
    list.push(subscription);
    byUser.set(subscription.user_id, list);
  }

  let sent = 0;
  const expired: string[] = [];
  for (const reminder of due) {
    const result = await sendPush(byUser.get(reminder.user_id) ?? [], {
      title: `⏰ ${reminder.title}`,
      body: `Sua tarefa é agora, às ${reminder.due_time.slice(0, 5)}.`,
      url: "/app",
      tag: `task-${reminder.task_id}`,
    });
    sent += result.sent;
    expired.push(...result.expired);
  }

  if (expired.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", expired);
  }

  return NextResponse.json({ reminders: due.length, sent, expired: expired.length });
}

export const GET = handle;
export const POST = handle;
