import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/recuperar-senha");

  return (
    <AuthCard
      title="Crie uma nova senha"
      description="Escolha uma senha segura que você não use em outro lugar."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
