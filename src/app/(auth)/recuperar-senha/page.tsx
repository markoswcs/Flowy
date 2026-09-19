import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { RecoveryForm } from "@/components/auth/recovery-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function RecoveryPage() {
  return (
    <AuthCard
      title="Recupere seu acesso"
      description="Enviaremos um link seguro para criar uma nova senha."
      footer={
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href="/login"
        >
          Voltar para entrar
        </Link>
      }
    >
      <RecoveryForm />
    </AuthCard>
  );
}
