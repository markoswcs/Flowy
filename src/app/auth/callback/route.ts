import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  // Supabase confirms the address before redirecting here, so the sign-up link
  // only needs to land on the login page. Skipping the code exchange keeps it
  // working when the e-mail is opened on another device or browser.
  if (next.startsWith("/login")) {
    const failed = url.searchParams.has("error") && !code;
    return NextResponse.redirect(
      new URL(failed ? "/login?erro=link-expirado" : next, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?erro=link-invalido", url.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The code may have been used already (link opened twice) or started on
    // another address; a person who is signed in anyway just goes on.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Not signed in. A password-reset link that failed says the link expired;
    // anything else was a Google sign-in that did not finish, so the message
    // says to try Google again.
    const failure = next.startsWith("/redefinir-senha") ? "link-expirado" : "google";
    return NextResponse.redirect(
      new URL(user ? next : `/login?erro=${failure}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
