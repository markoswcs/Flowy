import type {
  Feeling,
  WorkoutLog,
  WorkoutProfile,
  WorkoutProfileInput,
} from "@/features/workouts/types";
import { getAuthenticatedClient } from "@/services/authenticated-client";

export async function getWorkoutProfile(): Promise<WorkoutProfile | null> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("workout_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as WorkoutProfile | null) ?? null;
}

/** Saves the questionnaire; answering it again keeps the intensity and swaps already earned. */
export async function saveWorkoutProfile(input: WorkoutProfileInput): Promise<WorkoutProfile> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("workout_profiles")
    .upsert({ ...input, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as WorkoutProfile;
}

export async function updateWorkoutProfile(
  changes: Partial<Pick<WorkoutProfile, "intensity" | "swaps" | "custom_sessions">>,
): Promise<WorkoutProfile> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("workout_profiles")
    .update(changes)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data as WorkoutProfile;
}

/** Logs from `since` (yyyy-mm-dd) on, newest first. */
export async function listWorkoutLogs(since: string): Promise<WorkoutLog[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("day", since)
    .order("day", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkoutLog[];
}

export async function logWorkout(input: {
  day: string;
  session: string;
  status: WorkoutLog["status"];
  feeling?: Feeling | null;
}): Promise<WorkoutLog> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("workout_logs")
    .upsert(
      { ...input, feeling: input.feeling ?? null, user_id: userId },
      { onConflict: "user_id,day" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as WorkoutLog;
}

export async function deleteWorkoutLog(day: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("workout_logs")
    .delete()
    .eq("user_id", userId)
    .eq("day", day);
  if (error) throw error;
}
