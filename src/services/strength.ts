import type { BodyWeight, LoggedSet } from "@/features/workouts/strength";
import { getAuthenticatedClient } from "@/services/authenticated-client";

/** numeric columns come back as strings from PostgREST. */
const toNumber = (value: unknown) => (value === null || value === undefined ? null : Number(value));

/** Logged sets from `since` (yyyy-mm-dd) on, newest first, read in pages (the API returns 1000 rows at most). */
export async function listSets(since: string): Promise<LoggedSet[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const rows: (LoggedSet & { user_id?: string })[] = [];
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await supabase
      .from("workout_sets")
      // "*": kind and rir only exist after the phase-two migration.
      .select("*")
      .eq("user_id", userId)
      .gte("day", since)
      .order("day", { ascending: false })
      .order("exercise_id")
      .order("set_number")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as typeof rows));
    if ((data ?? []).length < 1000) break;
  }
  return rows.map(({ day, exercise_id, set_number, amount, weight_kg, kind, rir }) => ({
    day,
    exercise_id,
    set_number,
    amount,
    weight_kg: toNumber(weight_kg),
    kind: kind ?? "normal",
    rir: rir ?? null,
  }));
}

function row(set: LoggedSet, userId: string, withExtras: boolean) {
  const { kind, rir, ...rest } = set;
  return withExtras ? { ...rest, user_id: userId, kind: kind ?? "normal", rir: rir ?? null } : { ...rest, user_id: userId };
}

/**
 * Upserts sets; before the phase-two migration (no kind/rir columns yet) it
 * saves them without those two fields instead of failing.
 */
async function upsertSets(sets: LoggedSet[]) {
  const { supabase, userId } = await getAuthenticatedClient();
  const send = (withExtras: boolean) =>
    supabase
      .from("workout_sets")
      .upsert(sets.map((set) => row(set, userId, withExtras)), { onConflict: "user_id,day,exercise_id,set_number" });
  let { error } = await send(true);
  if (error && (error.code === "PGRST204" || /column/i.test(error.message))) ({ error } = await send(false));
  if (error) throw error;
}

/** Saves one set; logging the same set again replaces it. */
export async function saveSet(set: LoggedSet): Promise<void> {
  await upsertSets([set]);
}

/** Many sets at once (import), in chunks. */
export async function saveSets(sets: LoggedSet[]): Promise<void> {
  for (let start = 0; start < sets.length; start += 500) await upsertSets(sets.slice(start, start + 500));
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
