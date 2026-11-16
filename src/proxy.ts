import { NextResponse, type NextRequest } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { updateSession } from "@/lib/supabase/middleware";

/** The old address. Every page there now opens on the current one. */
const OLD_HOST = "flowy-mauve.vercel.app";
const HOME = "https://useflowy.vercel.app";

// Per address (IP), per minute. Generous for a person, tight for a script.
const API_LIMIT = 60;
const AUTH_LIMIT = 20;

function clientIp(request: NextRequest) {
  return request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Apps installed from the old address keep their reminders working (the
  // service worker and its notification buttons call /sw.js and /api there);
  // everything a person opens moves to useflowy.vercel.app.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host === OLD_HOST && pathname !== "/sw.js" && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(`${HOME}${pathname}${search}`, 308);
  }

  // Scripts hammering the API or the sign-in pages get a short pause.
  const limited = pathname.startsWith("/api/")
    ? !pathname.startsWith("/api/cron/") && !rateLimit(`api:${clientIp(request)}`, API_LIMIT)
    : (pathname === "/login" || pathname.startsWith("/auth/")) && request.method === "POST"
      ? !rateLimit(`auth:${clientIp(request)}`, AUTH_LIMIT)
      : false;
  if (limited) {
    return NextResponse.json(
      { error: "Muitas tentativas. Espere um minuto e tente de novo." },
      { status: 429, headers: { "retry-after": "60" } },
    );
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4)$).*)",
  ],
};
