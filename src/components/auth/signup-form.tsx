"use client";

import { useActionState } from "react";

import { signUpAction } from "@/app/(auth)/actions";
import { AuthMessage, FieldError } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialAuthState } from "@/lib/auth-action-state";

export function SignupForm() {
  const [state, action, pending] = useActionState(
    signUpAction,
    initialAuthState,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? (
        <AuthMessage status={state.status === "success" ? "success" : "error"}>
          {state.message}
        </AuthMessage>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          autoFocus
          required
          aria-invalid={Boolean(state.errors?.name?.[0])}
          aria-describedby={state.errors?.name?.[0] ? "name-error" : undefined}
        />
        <FieldError id="name-error" error={state.errors?.name?.[0]} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={Boolean(state.errors?.email?.[0])}
          aria-describedby={
            state.errors?.email?.[0] ? "email-error" : undefined
          }
        />
        <FieldError id="email-error" error={state.errors?.email?.[0]} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state.errors?.password?.[0])}
          aria-describedby={
            state.errors?.password?.[0] ? "password-error" : "password-hint"
          }
        />
        <p id="password-hint" className="text-xs text-muted-foreground">
          Pelo menos 8 caracteres.
        </p>
        <FieldError id="password-error" error={state.errors?.password?.[0]} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state.errors?.confirmPassword?.[0])}
          aria-describedby={
            state.errors?.confirmPassword?.[0]
              ? "confirm-password-error"
              : undefined
          }
        />
        <FieldError
          id="confirm-password-error"
          error={state.errors?.confirmPassword?.[0]}
        />
      </div>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
