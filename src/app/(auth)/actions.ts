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
      .min(2, "Informe como podemos te chamar.")
      .max(50, "O nome não pode ter mais de 50 caracteres."),
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

// E-mail links must always point at the public Flowy domain. Using the request
// origin in production could send people to a protected Vercel preview URL.
async function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    if (configured && !configured.includes("localhost")) return configured;
    const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercelProduction) return `https://${vercelProduction}`;
  }
  const requestHeaders = await headers();
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
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/login?confirmacao=email")}`,
      data: { display_name: parsed.data.name },
    },
  });

  if (error)
    return { status: "error", message: getAuthErrorMessage(error.message) };
  if (data.session) redirect("/app");

  return {
    status: "success",
    message:
      "Conta criada! Enviamos um link de confirmação para o seu e-mail. Depois de confirmar, você volta direto para o login do Flowy.",
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
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/redefinir-senha")}`,
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

export async function signInWithGoogleAction(formData: FormData) {
  const next = safeNextPath(
    typeof formData.get("next") === "string" ? (formData.get("next") as string) : null,
  );
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) redirect("/login?erro=google");
  redirect(data.url);
}
