"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthMessage, FieldError } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/app/(auth)/actions";
import { initialAuthState } from "@/lib/auth-action-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(
    signInAction,
    initialAuthState,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.message ? (
        <AuthMessage status="error">{state.message}</AuthMessage>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          required
          aria-invalid={Boolean(state.errors?.email?.[0])}
          aria-describedby={
            state.errors?.email?.[0] ? "email-error" : undefined
          }
        />
        <FieldError id="email-error" error={state.errors?.email?.[0]} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/recuperar-senha"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm"
          >
            Esqueci minha senha
          </Link>
        </div>
        <PasswordField
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.errors?.password?.[0])}
          aria-describedby={
            state.errors?.password?.[0] ? "password-error" : undefined
          }
        />
        <FieldError id="password-error" error={state.errors?.password?.[0]} />
      </div>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
