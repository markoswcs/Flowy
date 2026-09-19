import type { SupabaseClient, AuthUser as User } from "@supabase/supabase-js";

import type {
  ThemePreference,
  UserPreferences,
  UserProfile,
} from "@/types/content";

export async function getCurrentUser(client: SupabaseClient): Promise<User> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw error ?? new Error("Sessão expirada.");
  return data.user;
}

export async function getProfile(client: SupabaseClient): Promise<UserProfile> {
  const user = await getCurrentUser(client);
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data as UserProfile;
}

export async function updateProfile(
  client: SupabaseClient,
  changes: Pick<Partial<UserProfile>, "display_name" | "avatar_url">,
): Promise<UserProfile> {
  const user = await getCurrentUser(client);
  const { data, error } = await client
    .from("profiles")
    .update(changes)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as UserProfile;
}

export async function getPreferences(
  client: SupabaseClient,
): Promise<UserPreferences> {
  const user = await getCurrentUser(client);
  const { data, error } = await client
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return data as UserPreferences;
}

export async function updatePreferences(
  client: SupabaseClient,
  changes: Partial<
    Pick<UserPreferences, "theme" | "week_starts_on" | "default_task_view">
  >,
): Promise<UserPreferences> {
  const user = await getCurrentUser(client);
  const { data, error } = await client
    .from("user_preferences")
    .update(changes)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as UserPreferences;
}

export async function uploadAvatar(
  client: SupabaseClient,
  file: File,
): Promise<string> {
  const user = await getCurrentUser(client);
  const path = `${user.id}/avatar`;
  const { error } = await client.storage.from("avatars").upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw error;
  const { data } = client.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function changePassword(
  client: SupabaseClient,
  password: string,
): Promise<void> {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

export async function saveTheme(
  client: SupabaseClient,
  theme: ThemePreference,
): Promise<UserPreferences> {
  return updatePreferences(client, { theme });
}
