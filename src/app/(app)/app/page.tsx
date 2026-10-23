import { DashboardPage } from "@/features/tasks/dashboard-page";
import { createClient } from "@/lib/supabase/server";
import type { TaskScope } from "@/types/productivity";

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

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const user = claims
    ? {
        id: claims.sub,
        email: typeof claims.email === "string" ? claims.email : undefined,
        user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
      }
    : null;

  if (!user) return null;

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
    requestedView = preferences?.default_task_view ?? "today";
  }
  const initialScope = allowedScopes.has(requestedView as TaskScope)
    ? (requestedView as TaskScope)
    : "today";

  const metadataName =
    typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user?.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null;
  const emailName = user?.email?.split("@")[0] || "Usuário";

  return (
    <DashboardPage
      displayName={profile?.display_name || metadataName || emailName}
      userId={user.id}
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
