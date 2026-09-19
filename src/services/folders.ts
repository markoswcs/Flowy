import { getAuthenticatedClient } from "@/services/authenticated-client";
import type {
  CreateFolderInput,
  Folder,
  UpdateFolderInput,
} from "@/types/productivity";

const FOLDER_FIELDS =
  "id,user_id,name,position,created_at,updated_at,deleted_at,color,icon,parent_id";

export async function listFolders(): Promise<Folder[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("folders")
    .select(FOLDER_FIELDS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Folder[];
}

export async function getFolder(folderId: string): Promise<Folder | null> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("folders")
    .select(FOLDER_FIELDS)
    .eq("id", folderId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as Folder | null;
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const { supabase, userId } = await getAuthenticatedClient();
  const name = input.name.trim();
  if (!name) throw new Error("Digite um nome para a pasta.");

  const { data, error } = await supabase
    .from("folders")
    .insert({
      user_id: userId,
      name,
      position: input.position ?? Date.now(),
      color: input.color ?? null,
      icon: input.icon ?? null,
      parent_id: input.parent_id ?? null,
    })
    .select(FOLDER_FIELDS)
    .single();

  if (error) throw error;
  return data as Folder;
}

export async function updateFolder(input: UpdateFolderInput): Promise<Folder> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { id, ...changes } = input;
  const values: Record<string, unknown> = {
    ...changes,
    updated_at: new Date().toISOString(),
  };

  if (typeof changes.name === "string") {
    values.name = changes.name.trim();
    if (!values.name) throw new Error("Digite um nome para a pasta.");
  }

  const { data, error } = await supabase
    .from("folders")
    .update(values)
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(FOLDER_FIELDS)
    .single();

  if (error) throw error;
  return data as Folder;
}

export async function reorderFolders(
  folders: Array<Pick<Folder, "id" | "position">>,
): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const updatedAt = new Date().toISOString();
  const results = await Promise.all(
    folders.map(({ id, position }) =>
      supabase
        .from("folders")
        .update({ position, updated_at: updatedAt })
        .eq("id", id)
        .eq("user_id", userId)
        .is("deleted_at", null),
    ),
  );
  const firstError = results.find(({ error }) => error)?.error;
  if (firstError) throw firstError;
}

export async function softDeleteFolder(folderId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("folders")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", folderId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw error;
}

export async function restoreFolder(folderId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("folders")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", folderId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) throw error;
}

export async function permanentlyDeleteFolder(folderId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) throw error;
}
