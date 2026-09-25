import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard, AuthMessage } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrar" };

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    erro?: string;
    senha?: string;
    confirmacao?: string;
    conta?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = params.next ? safeNextPath(params.next) : undefined;
  const message =
    params.conta === "excluida"
      ? {
          status: "success" as const,
          text: "Sua conta e seus dados foram excluídos.",
        }
      : params.confirmacao === "email"
        ? {
            status: "success" as const,
            text: "E-mail confirmado. Entre para acessar o Flowy.",
          }
      : params.senha === "alterada"
      ? {
          status: "success" as const,
          text: "Senha alterada. Entre novamente para continuar.",
        }
      : params.erro
        ? {
            status: "error" as const,
            text: "Este link é inválido ou expirou. Solicite um novo.",
          }
        : null;

  return (
    <AuthCard
      title="Que bom ter você de volta"
      description="Entre para continuar de onde parou."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="/cadastro"
          >
            Criar conta
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {message ? (
          <AuthMessage status={message.status}>{message.text}</AuthMessage>
        ) : null}
        <LoginForm next={next} />
      </div>
    </AuthCard>
  );
}
