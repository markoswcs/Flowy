import type { SupabaseClient } from "@supabase/supabase-js";

export async function getExcalidrawLibrary(
  client: SupabaseClient,
  userId: string,
): Promise<unknown[] | null> {
  const { data, error } = await client
    .from("excalidraw_libraries")
    .select("library_items")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.library_items) ? data.library_items : null;
}

export async function saveExcalidrawLibrary(
  client: SupabaseClient,
  userId: string,
  libraryItems: readonly unknown[],
): Promise<void> {
  const { error } = await client
    .from("excalidraw_libraries")
    .upsert(
      { user_id: userId, library_items: libraryItems },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
