import { createClient } from "@/lib/supabase/client";

export async function getAuthenticatedClient() {
  const supabase = createClient();
  // The session is read from local storage (and refreshed only when expired),
  // so queries no longer wait for an auth round trip first. RLS still checks
  // every request against the signed token on the server.
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (error || !user) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }

  return { supabase, userId: user.id };
}

export function messageFromUnknownError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível concluir a ação.";
}
