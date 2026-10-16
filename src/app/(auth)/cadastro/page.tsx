import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Comece com clareza"
      description="Crie sua conta e organize o que importa."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="/login"
          >
            Entrar
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <GoogleButton label="Criar conta com Google" />
        <SignupForm />
      </div>
    </AuthCard>
  );
}
