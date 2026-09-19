import type { JSONContent } from "@tiptap/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Note } from "@/types/content";

const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type NoteRecord = Omit<Note, "categories"> & {
  note_categories?: Array<{
    category: { id: string; name: string; color: string } | null;
  }>;
};

function normalizeNote(record: NoteRecord): Note {
  const { note_categories, ...note } = record;
  return {
    ...note,
    content: note.content || EMPTY_DOCUMENT,
    categories: (note_categories ?? [])
      .map((item) => item.category)
      .filter((category): category is NonNullable<typeof category> =>
        Boolean(category),
      ),
  };
}

async function authenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw error ?? new Error("Sessão expirada.");
  return data.user.id;
}

export async function listNotes(client: SupabaseClient): Promise<Note[]> {
  const { data, error } = await client
    .from("notes")
    .select(
      "*, folder:folders(id,name), note_categories(category:categories(id,name,color))",
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as NoteRecord[]).map(normalizeNote);
}

export async function getNote(
  client: SupabaseClient,
  noteId: string,
): Promise<Note> {
  const { data, error } = await client
    .from("notes")
    .select(
      "*, folder:folders(id,name), note_categories(category:categories(id,name,color))",
    )
    .eq("id", noteId)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  return normalizeNote(data as unknown as NoteRecord);
}

export async function createNote(
  client: SupabaseClient,
  input?: { folderId?: string | null; title?: string },
): Promise<Note> {
  const userId = await authenticatedUserId(client);
  const { data, error } = await client
    .from("notes")
    .insert({
      user_id: userId,
      folder_id: input?.folderId ?? null,
      title: input?.title?.trim() || "Sem título",
      content: EMPTY_DOCUMENT,
      plain_text: "",
    })
    .select("*, folder:folders(id,name)")
    .single();

  if (error) throw error;
  return normalizeNote(data as unknown as NoteRecord);
}

export interface NoteChanges {
  title?: string;
  content?: JSONContent;
  plain_text?: string;
  folder_id?: string | null;
}

export async function updateNote(
  client: SupabaseClient,
  noteId: string,
  changes: NoteChanges,
): Promise<Note> {
  const { data, error } = await client
    .from("notes")
    .update(changes)
    .eq("id", noteId)
    .is("deleted_at", null)
    .select("*, folder:folders(id,name)")
    .single();

  if (error) throw error;
  return normalizeNote(data as unknown as NoteRecord);
}

export async function replaceNoteCategories(
  client: SupabaseClient,
  noteId: string,
  categoryIds: string[],
): Promise<void> {
  const userId = await authenticatedUserId(client);
  const { error: deleteError } = await client
    .from("note_categories")
    .delete()
    .eq("note_id", noteId);
  if (deleteError) throw deleteError;

  if (categoryIds.length === 0) return;
  const { error } = await client.from("note_categories").insert(
    categoryIds.map((categoryId) => ({
      note_id: noteId,
      category_id: categoryId,
      user_id: userId,
    })),
  );
  if (error) throw error;
}

export async function moveNoteToTrash(
  client: SupabaseClient,
  noteId: string,
): Promise<void> {
  const { error } = await client
    .from("notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", noteId)
    .is("deleted_at", null);
  if (error) throw error;
}

export async function restoreNote(
  client: SupabaseClient,
  noteId: string,
): Promise<void> {
  const { error } = await client
    .from("notes")
    .update({ deleted_at: null })
    .eq("id", noteId)
    .not("deleted_at", "is", null);
  if (error) throw error;
}

export async function permanentlyDeleteNote(
  client: SupabaseClient,
  noteId: string,
): Promise<void> {
  const { error } = await client
    .from("notes")
    .delete()
    .eq("id", noteId)
    .not("deleted_at", "is", null);
  if (error) throw error;
}

export { EMPTY_DOCUMENT };
