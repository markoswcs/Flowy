import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { interpretTask } from "@/features/tasks/smart-task";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  BAD_CODE_TEXT,
  HELP_TEXT,
  NOT_LINKED_TEXT,
  NO_TEXT_TEXT,
  createdText,
  dateKey,
  incomingMessages,
  intentOf,
  linkedText,
  todayText,
  validSignature,
  wallClock,
  type IncomingMessage,
} from "@/lib/whatsapp/bot";
import { sendWhatsAppText } from "@/lib/whatsapp/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meta checks the address once, when the webhook is set up. */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (token && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === token) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function admin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createAdminClient(getSupabaseEnv().url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function linkNumber(db: SupabaseClient, message: IncomingMessage, code: string) {
  const { data: link } = await db
    .from("whatsapp_links")
    .select("user_id, code_expires_at")
    .eq("code", code)
    .maybeSingle();
  if (!link || !link.code_expires_at || new Date(link.code_expires_at) < new Date()) return BAD_CODE_TEXT;
  // A number belongs to one account: taking it here frees it elsewhere.
  await db.from("whatsapp_links").update({ phone: null, linked_at: null }).eq("phone", message.from);
  const { error } = await db
    .from("whatsapp_links")
    .update({ phone: message.from, linked_at: new Date().toISOString(), code: null, code_expires_at: null })
    .eq("user_id", link.user_id);
  if (error) throw error;
  const { data: profile } = await db.from("profiles").select("display_name").eq("user_id", link.user_id).maybeSingle();
  return linkedText(profile?.display_name ?? null);
}

async function listToday(db: SupabaseClient, userId: string, now: Date) {
  const today = dateKey(now);
  const { data, error } = await db
    .from("tasks")
    .select("title, due_date, due_time")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .neq("status", "completed")
    .lte("due_date", today)
    .order("due_date", { ascending: true })
    .order("due_time", { ascending: true, nullsFirst: false })
    .limit(50);
  if (error) throw error;
  return todayText(data ?? [], now);
}

async function createTask(db: SupabaseClient, userId: string, text: string, now: Date) {
  const [folders, categories] = await Promise.all([
    db.from("folders").select("id, name").eq("user_id", userId).is("deleted_at", null),
    db.from("categories").select("id, name").eq("user_id", userId),
  ]);
  const smart = interpretTask(
    text,
    { folders: folders.data ?? [], categories: categories.data ?? [] },
    now,
  );
  const title = (smart.title || text).slice(0, 300);
  const steps = smart.subtasks.length ? smart.subtasks.map((step) => `- ${step}`).join("\n") : "";
  const description = [smart.description, steps].filter(Boolean).join("\n\n") || null;
  const { data, error } = await db
    .from("tasks")
    .insert({
      user_id: userId,
      title,
      description,
      due_date: smart.due_date,
      due_time: smart.due_date ? smart.due_time : null,
      recurrence: smart.due_date ? smart.recurrence : null,
      priority: smart.priority,
      folder_id: smart.folderId,
      status: "todo",
      position: Date.now(),
    })
    .select("id, title, due_date, due_time, recurrence")
    .single();
  if (error) throw error;
  if (smart.categoryIds.length) {
    await db
      .from("task_categories")
      .insert(smart.categoryIds.map((categoryId) => ({ task_id: data.id, category_id: categoryId, user_id: userId })));
  }
  return createdText(data, now);
}

async function answer(db: SupabaseClient, message: IncomingMessage): Promise<string> {
  if (!message.text) return NO_TEXT_TEXT;
  const intent = intentOf(message.text);
  if (intent.kind === "link") return linkNumber(db, message, intent.code);

  const { data: link } = await db.from("whatsapp_links").select("user_id").eq("phone", message.from).maybeSingle();
  if (!link) return intent.kind === "help" ? `${HELP_TEXT}\n\n${NOT_LINKED_TEXT}` : NOT_LINKED_TEXT;
  if (intent.kind === "help") return HELP_TEXT;

  const { data: preferences } = await db
    .from("user_preferences")
    .select("timezone")
    .eq("user_id", link.user_id)
    .maybeSingle();
  const now = wallClock(preferences?.timezone ?? "America/Sao_Paulo");
  if (intent.kind === "today") return listToday(db, link.user_id, now);
  return createTask(db, link.user_id, intent.text, now);
}

export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const raw = await request.text();
  if (!secret || !validSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  }
  const db = admin();
  if (!db) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 500 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  for (const message of incomingMessages(payload)) {
    // WhatsApp retries deliveries: each message is handled once.
    const { error: seen } = await db.from("whatsapp_messages").insert({ id: message.id });
    if (seen) continue;
    let reply: string;
    try {
      reply = await answer(db, message);
    } catch (error) {
      console.error("Falha ao tratar mensagem do WhatsApp.", error);
      reply = "Não consegui anotar agora 😕 Tente de novo em instantes.";
    }
    await sendWhatsAppText(message.from, reply).catch((error) =>
      console.error("Falha ao responder no WhatsApp.", error),
    );
  }
  // Always 200 once the signature is right, or Meta keeps retrying.
  return NextResponse.json({ ok: true });
}
