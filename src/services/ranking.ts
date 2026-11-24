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
  /** Last 7 days, oldest first (after the social migration). */
  week?: boolean[] | null;
  cheers?: number;
  cheered_today?: boolean;
  last_active?: string | null;
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

/** "Dar força": one flame a day to someone in the ranking (or take it back). */
export async function setCheer(toUser: string, on: boolean) {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = on
    ? await supabase
        .from("streak_cheers")
        .insert({ from_user: userId, to_user: toUser })
    : await supabase
        .from("streak_cheers")
        .delete()
        .eq("from_user", userId)
        .eq("to_user", toUser)
        .eq(
          "day",
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
          }).format(new Date()),
        );
  if (error) throw error;
}
