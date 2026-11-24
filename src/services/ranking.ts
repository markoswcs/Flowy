import { getAuthenticatedClient } from "@/services/authenticated-client";

export interface RankEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  streak: number;
  active_days: number;
  trains: boolean;
  workouts: number;
  workout_minutes: number;
  is_me: boolean;
  visible: boolean;
}

/** Everyone who shows up in the ranking, plus the person themself. */
export async function getLeaderboard(): Promise<RankEntry[]> {
  const { supabase } = await getAuthenticatedClient();
  const { data, error } = await supabase.rpc("leaderboard");
  if (error) throw error;
  return (data ?? []) as RankEntry[];
}

/** Private profile: off the ranking (still sees it and their own place). */
export async function setRankingVisible(visible: boolean) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ranking_visible: visible })
    .eq("user_id", userId);
  if (error) throw error;
}
