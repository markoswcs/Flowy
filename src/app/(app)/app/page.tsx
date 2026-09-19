import { DashboardPage } from "@/features/tasks/dashboard-page";
import { createClient } from "@/lib/supabase/server";
import type { TaskScope } from "@/types/productivity";

import type { SupabaseClient } from "@supabase/supabase-js";

const allowedScopes = new Set<TaskScope>([
  "all",
  "today",
  "overdue",
  "upcoming",
  "completed",
]);

interface AppHomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function autoTrashOldTasks(supabase: SupabaseClient, userId: string) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("status", "completed")
    .lt("completed_at", oneDayAgo)
    .is("deleted_at", null)
    .eq("user_id", userId);
}

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await autoTrashOldTasks(supabase, user.id);

  const values = await searchParams;
  const initialOrganizer =
    values.organize === "folders" || values.organize === "categories"
      ? values.organize
      : null;
  let requestedView = typeof values.view === "string" ? values.view : null;

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("default_task_view")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!requestedView) {
    requestedView = preferences?.default_task_view ?? "all";
  }
  const initialScope = allowedScopes.has(requestedView as TaskScope)
    ? (requestedView as TaskScope)
    : "all";

  const metadataName =
    typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null;
  const emailName = user?.email?.split("@")[0] || "Usuário";

  return (
    <DashboardPage
      displayName={profile?.display_name || metadataName || emailName}
      initialOrganizer={initialOrganizer}
      initialScope={initialScope}
      initialLayout={
        values.layout === "kanban"
          ? "kanban"
          : values.layout === "matrix"
            ? "matrix"
            : "list"
      }
    />
  );
}
