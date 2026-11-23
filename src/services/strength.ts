import type { BodyWeight, LoggedSet } from "@/features/workouts/strength";
import { getAuthenticatedClient } from "@/services/authenticated-client";

/** numeric columns come back as strings from PostgREST. */
const toNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));

/** Logged sets from `since` (yyyy-mm-dd) on. */
export async function listSets(since: string): Promise<LoggedSet[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("workout_sets")
    .select("day, exercise_id, set_number, amount, weight_kg")
    .eq("user_id", userId)
    .gte("day", since)
    .order("day", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return ((data ?? []) as LoggedSet[]).map((row) => ({ ...row, weight_kg: toNumber(row.weight_kg) }));
}

/** Saves one set; logging the same set again replaces it. */
export async function saveSet(set: LoggedSet): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("workout_sets")
    .upsert({ ...set, user_id: userId }, { onConflict: "user_id,day,exercise_id,set_number" });
  if (error) throw error;
}

export async function deleteSet(set: Pick<LoggedSet, "day" | "exercise_id" | "set_number">): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("workout_sets")
    .delete()
    .eq("user_id", userId)
    .eq("day", set.day)
    .eq("exercise_id", set.exercise_id)
    .eq("set_number", set.set_number);
  if (error) throw error;
}

export async function listBodyWeights(since: string): Promise<BodyWeight[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("body_weights")
    .select("day, weight_kg")
    .eq("user_id", userId)
    .gte("day", since)
    .order("day", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as BodyWeight[]).map((row) => ({ day: row.day, weight_kg: Number(row.weight_kg) }));
}

export async function saveBodyWeight(entry: BodyWeight): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase.from("body_weights").upsert({ ...entry, user_id: userId }, { onConflict: "user_id,day" });
  if (error) throw error;
}

export async function deleteBodyWeight(day: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase.from("body_weights").delete().eq("user_id", userId).eq("day", day);
  if (error) throw error;
}

export async function saveWeightGoal(goal: number | null): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase.from("workout_profiles").update({ body_weight_goal: goal }).eq("user_id", userId);
  if (error) throw error;
}
