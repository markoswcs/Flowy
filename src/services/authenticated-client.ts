import { createClient } from "@/lib/supabase/client";

export async function getAuthenticatedClient() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }

  return { supabase, userId: user.id };
}

export function messageFromUnknownError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível concluir a ação.";
}
