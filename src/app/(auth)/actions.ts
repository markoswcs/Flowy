"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { AuthActionState } from "@/lib/auth-action-state";
import { getAuthErrorMessage } from "@/lib/supabase/auth-errors";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

const email = z.string().trim().email("Informe um e-mail válido.");
const password = z.string().min(8, "Use pelo menos 8 caracteres.").max(72);

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
  next: z.string().optional(),
});

const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome.")
      .max(50, "O nome não pode ter mais de 50 caracteres.")
      .regex(
        /^[^\s]+\s+[^\s]+$/,
        "Informe nome e sobrenome para concluir o cadastro."
      ),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine(
    (values: { password: string; confirmPassword: string }) =>
      values.password === values.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "As senhas não coincidem.",
    },
  );

const recoverySchema = z.object({ email });
const resetSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine(
    (values: { password: string; confirmPassword: string }) =>
      values.password === values.confirmPassword,
    {
      path: ["confirmPassword"],
      message: "As senhas não coincidem.",
    },
  );

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function validationError(error: z.ZodError): AuthActionState {
  return {
    status: "error",
    message: "Revise os campos destacados.",
    errors: error.flatten().fieldErrors,
  };
}

async function getSiteUrl() {
  const requestHeaders = await headers();
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return requestHeaders.get("origin") || configured || "http://localhost:3000";
}

export async function signInAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(values(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error)
    return { status: "error", message: getAuthErrorMessage(error.message) };

  redirect(safeNextPath(parsed.data.next ?? null));
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse(values(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/login?confirmacao=email`,
      data: { display_name: parsed.data.name },
    },
  });

  if (error)
    return { status: "error", message: getAuthErrorMessage(error.message) };
  if (data.session) redirect("/app");

  return {
    status: "success",
    message: "Conta criada. Confira seu e-mail para confirmar o acesso.",
  };
}

export async function requestPasswordResetAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = recoverySchema.safeParse(values(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha`,
    },
  );

  if (error)
    return { status: "error", message: getAuthErrorMessage(error.message) };

  // The same response avoids revealing whether an address has an account.
  return {
    status: "success",
    message:
      "Se este e-mail estiver cadastrado, você receberá um link em instantes.",
  };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetSchema.safeParse(values(formData));
  if (!parsed.success) return validationError(parsed.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "O link expirou. Solicite uma nova recuperação.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error)
    return { status: "error", message: getAuthErrorMessage(error.message) };

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?senha=alterada");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function deleteAccountAction(formData: FormData) {
  if (formData.get("confirmation") !== "EXCLUIR MINHA CONTA") {
    throw new Error("Digite a frase de confirmação exatamente como informada.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("A exclusão de conta não está configurada no servidor.");
  }

  const { url } = getSupabaseEnv();
  const admin = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await admin.storage.from("avatars").remove([`${user.id}/avatar`]);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(getAuthErrorMessage(error.message));

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?conta=excluida");
}
