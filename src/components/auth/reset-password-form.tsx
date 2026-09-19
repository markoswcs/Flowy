"use client";

import { useActionState } from "react";

import { updatePasswordAction } from "@/app/(auth)/actions";
import { AuthMessage, FieldError } from "@/components/auth/auth-card";
import { PasswordField } from "@/components/auth/password-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { initialAuthState } from "@/lib/auth-action-state";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialAuthState,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? (
        <AuthMessage status="error">{state.message}</AuthMessage>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          autoFocus
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
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
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
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
