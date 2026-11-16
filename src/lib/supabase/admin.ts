import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "@/lib/supabase/env";

/** Server-only client with the service role, or null when the key is missing. */
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(getSupabaseEnv().url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
