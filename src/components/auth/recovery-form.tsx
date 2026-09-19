"use client";

import { useActionState } from "react";

import { requestPasswordResetAction } from "@/app/(auth)/actions";
import { AuthMessage, FieldError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialAuthState } from "@/lib/auth-action-state";

export function RecoveryForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
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
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          aria-invalid={Boolean(state.errors?.email?.[0])}
          aria-describedby={
            state.errors?.email?.[0] ? "email-error" : undefined
          }
        />
        <FieldError id="email-error" error={state.errors?.email?.[0]} />
      </div>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
