import { timingSafeEqual } from "node:crypto";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { buildMorningDigest, type MorningDigest } from "@/lib/push/morning-digest";
import { buildTaskReminder, type TaskReminder } from "@/lib/push/task-reminder";
import { sendPush, type PushPayload, type StoredPushSubscription } from "@/lib/push/web-push";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 21h: a nudge to empty the head before sleeping (opens the quick dump). */
const EVENING_PROMPT: PushPayload = {
  title: "🌙 Algo para amanhã?",
  body: "Anote agora o que não pode esquecer e durma tranquilo.",
  url: "/app?view=upcoming&despejar=1",
  tag: "evening-prompt",
};

interface DueReminder extends TaskReminder {
  user_id: string;
}

interface MorningDigestRow extends MorningDigest {
  user_id: string;
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
// Sends task reminders and, from 8:00 local time, the daily morning digest.
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

  const [remindersResult, digestsResult, eveningResult] = await Promise.all([
    admin.rpc("claim_due_task_reminders"),
    admin.rpc("claim_morning_digests"),
    admin.rpc("claim_evening_prompts"),
  ]);
  if (remindersResult.error) {
    console.error("Falha ao buscar lembretes.", remindersResult.error);
    return NextResponse.json({ error: "Falha ao buscar lembretes." }, { status: 500 });
  }
  // A failing digest (e.g. migration not applied yet) must not block reminders.
  if (digestsResult.error) {
    console.error("Falha ao buscar resumos da manhã.", digestsResult.error);
  }

  // Same for the evening prompt (migration 20261111150000).
  if (eveningResult.error) {
    console.error("Falha ao buscar avisos da noite.", eveningResult.error);
  }
  const evenings = ((eveningResult.data ?? []) as { user_id: string }[]).map((row) => row.user_id);

  const due = (remindersResult.data ?? []) as DueReminder[];
  const digests = ((digestsResult.data ?? []) as MorningDigestRow[])
    .map((digest) => ({ userId: digest.user_id, payload: buildMorningDigest(digest) }))
    .filter((digest): digest is { userId: string; payload: PushPayload } =>
      Boolean(digest.payload),
    );
  if (due.length === 0 && digests.length === 0 && evenings.length === 0) {
    return NextResponse.json({ reminders: 0, digests: 0, evenings: 0, sent: 0 });
  }

  const userIds = [
    ...new Set([
      ...due.map((reminder) => reminder.user_id),
      ...digests.map((digest) => digest.userId),
      ...evenings,
    ]),
  ];
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

  // Reached no device although some are still valid: a temporary failure of
  // the push service. The caller unclaims it so the next run (within the
  // window) tries again instead of losing the notification.
  async function deliver(userId: string, payload: PushPayload) {
    const userSubscriptions = byUser.get(userId) ?? [];
    const result = await sendPush(userSubscriptions, payload);
    const retry = result.sent === 0 && userSubscriptions.length > result.expired.length;
    return { ...result, retry };
  }

  const [reminderResults, digestResults, eveningResults] = await Promise.all([
    Promise.all(
      due.map(async (reminder) => ({
        id: reminder.task_id,
        ...(await deliver(reminder.user_id, buildTaskReminder(reminder))),
      })),
    ),
    Promise.all(
      digests.map(async (digest) => ({
        id: digest.userId,
        ...(await deliver(digest.userId, digest.payload)),
      })),
    ),
    Promise.all(
      evenings.map(async (userId) => ({ id: userId, ...(await deliver(userId, EVENING_PROMPT)) })),
    ),
  ]);

  const results = [...reminderResults, ...digestResults, ...eveningResults];
  const sent = results.reduce((total, result) => total + result.sent, 0);
  const expired = results.flatMap((result) => result.expired);
  const retryTasks = reminderResults.filter((result) => result.retry).map((result) => result.id);
  const retryDigests = digestResults.filter((result) => result.retry).map((result) => result.id);

  if (expired.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", expired);
  }
  if (retryTasks.length > 0) {
    await admin.from("tasks").update({ reminder_sent_for: null }).in("id", retryTasks);
  }
  if (retryDigests.length > 0) {
    await admin
      .from("user_preferences")
      .update({ morning_digest_sent_on: null })
      .in("user_id", retryDigests);
  }

  const retryEvenings = eveningResults.filter((result) => result.retry).map((result) => result.id);
  if (retryEvenings.length > 0) {
    await admin.from("user_preferences").update({ evening_prompt_sent_on: null }).in("user_id", retryEvenings);
  }

  return NextResponse.json({
    reminders: due.length,
    digests: digests.length,
    evenings: evenings.length,
    sent,
    expired: expired.length,
    retry: retryTasks.length + retryDigests.length,
  });
}

export const GET = handle;
export const POST = handle;
