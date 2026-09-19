import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const supportedTypes = new Set<EmailOtpType>([
  "recovery",
  "email",
  "email_change",
  "invite",
  "magiclink",
  "signup",
]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type || !supportedTypes.has(type)) {
    return NextResponse.redirect(
      new URL("/login?erro=link-invalido", url.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/login?erro=link-expirado", url.origin),
    );
  }

  const destination = type === "recovery" ? "/redefinir-senha" : "/app";
  return NextResponse.redirect(new URL(destination, url.origin));
}
