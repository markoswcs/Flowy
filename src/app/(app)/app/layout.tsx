import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { PersistedTheme } from "@/components/system/persisted-theme";
import { createClient } from "@/lib/supabase/server";

export default async function PrivateAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: folders }, { data: categories }, { data: preferences }, { data: tasks }, { data: taskCategories }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("folders")
        .select("id, name, position, color, icon, parent_id")
        .is("deleted_at", null)
        .order("position", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, position, color")
        .is("deleted_at", null)
        .order("position", { ascending: true }),
      supabase
        .from("user_preferences")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("folder_id")
        .is("deleted_at", null)
        .neq("status", "completed"),
      supabase
        .from("task_categories")
        .select("category_id")
      // assuming task_categories exists, if not we'll ignore it. Flowy usually has tasks <-> categories M:N or 1:N.
    ]);

  const metadataName =
    typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name
      : null;
  const emailName = user.email?.split("@")[0] || "Usuário";

  const taskCountsByFolder = (tasks ?? []).reduce((acc, task) => {
    if (task.folder_id) {
      acc[task.folder_id] = (acc[task.folder_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const taskCountsByCategory = (taskCategories ?? []).reduce((acc, tc) => {
    if (tc.category_id) {
      acc[tc.category_id] = (acc[tc.category_id] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <PersistedTheme theme={preferences?.theme ?? "system"} />
      <AppShell
        user={{
          name: profile?.display_name || metadataName || emailName,
          email: user.email || "",
          avatarUrl: profile?.avatar_url,
        }}
        folders={(folders ?? []).map((folder) => ({
          id: folder.id,
          name: folder.name,
          color: folder.color,
          icon: folder.icon,
          parent_id: folder.parent_id,
          task_count: taskCountsByFolder[folder.id] || 0,
        }))}
        categories={(categories ?? []).map((cat) => ({
          id: cat.id,
          name: cat.name,
          color: cat.color,
          task_count: taskCountsByCategory[cat.id] || 0,
        }))}
      >
        {children}
      </AppShell>
    </>
  );
}
