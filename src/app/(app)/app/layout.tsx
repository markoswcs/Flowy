import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { PersistedTheme } from "@/components/system/persisted-theme";
import { createClient } from "@/lib/supabase/server";

// Only the signed token is checked here (verified locally, no database trip),
// so the shell is sent at once. Folders, labels, counts, profile and theme
// load in the browser, starting from this device's last copy.
export default async function PrivateAppLayout({
  children,
}: {
  children: ReactNode;
}) {
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

  if (!user) redirect("/login");

  const metadataName =
    typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name
      : typeof user.user_metadata.full_name === "string"
        ? user.user_metadata.full_name
        : null;
  const emailName = user.email?.split("@")[0] || "Usuário";

  return (
    <>
      <PersistedTheme />
      <AppShell
        userId={user.id}
        onboarded={Boolean(user.user_metadata.onboarded_at)}
        user={{
          name: metadataName || emailName,
          email: user.email || "",
          avatarUrl:
            typeof user.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : null,
        }}
      >
        {children}
      </AppShell>
    </>
  );
}
