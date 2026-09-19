import type { SupabaseClient } from "@supabase/supabase-js";

import type { GlobalSearchResult } from "@/types/content";

export async function globalSearch(
  client: SupabaseClient,
  searchQuery: string,
  limit = 20,
): Promise<GlobalSearchResult[]> {
  const term = searchQuery.trim();
  if (term.length < 2) return [];

  const { data, error } = await client.rpc("global_search", {
    search_query: term,
    result_limit: limit,
  });
  if (!error) return (data ?? []) as GlobalSearchResult[];

  // Compatible fallback while a new migration is being deployed.
  const pattern = `%${term}%`;
  const [tasks, notes, folders, cards] = await Promise.all([
    client
      .from("tasks")
      .select("id,title,description,updated_at")
      .is("deleted_at", null)
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .limit(6),
    client
      .from("notes")
      .select("id,title,plain_text,updated_at")
      .is("deleted_at", null)
      .or(`title.ilike.${pattern},plain_text.ilike.${pattern}`)
      .limit(6),
    client
      .from("folders")
      .select("id,name,updated_at")
      .is("deleted_at", null)
      .ilike("name", pattern)
      .limit(4),
    client
      .from("board_cards")
      .select("id,title,description,updated_at,board_id")
      .is("deleted_at", null)
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .limit(6),
  ]);

  const firstError = [
    tasks.error,
    notes.error,
    folders.error,
    cards.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  return [
    ...(tasks.data ?? []).map((task) => ({
      entity_type: "task" as const,
      id: task.id,
      title: task.title,
      excerpt: task.description,
      updated_at: task.updated_at,
      parent_id: null,
    })),
    ...(notes.data ?? []).map((note) => ({
      entity_type: "note" as const,
      id: note.id,
      title: note.title,
      excerpt: note.plain_text,
      updated_at: note.updated_at,
      parent_id: null,
    })),
    ...(folders.data ?? []).map((folder) => ({
      entity_type: "folder" as const,
      id: folder.id,
      title: folder.name,
      excerpt: null,
      updated_at: folder.updated_at,
      parent_id: null,
    })),
    ...(cards.data ?? []).map((card) => ({
      entity_type: "card" as const,
      id: card.id,
      title: card.title ?? "Card",
      excerpt: card.description,
      updated_at: card.updated_at,
      parent_id: card.board_id,
    })),
  ]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}
