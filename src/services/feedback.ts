import { getAuthenticatedClient } from "@/services/authenticated-client";

export type FeedbackKind = "bug" | "idea" | "other";
export type FeedbackStatus = "new" | "seen" | "done";

export interface Feedback {
  id: string;
  user_id: string;
  kind: FeedbackKind;
  message: string;
  page: string | null;
  app_version: string | null;
  author_name: string | null;
  author_email: string | null;
  status: FeedbackStatus;
  created_at: string;
}

/** Sends one message; who wrote it is filled in by the database. */
export async function sendFeedback(input: {
  kind: FeedbackKind;
  message: string;
  page?: string;
  app_version?: string;
}) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase.from("feedback").insert({
    kind: input.kind,
    message: input.message.trim().slice(0, 2000),
    page: input.page?.slice(0, 200) ?? null,
    app_version: input.app_version?.slice(0, 40) ?? null,
  });
  if (error) throw error;
}

/** The person's own messages, or everyone's for an admin (the database decides). */
export async function listFeedback(onlyMine: boolean): Promise<Feedback[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  let query = supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (onlyMine) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Feedback[];
}

export async function setFeedbackStatus(id: string, status: FeedbackStatus) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
