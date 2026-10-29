import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Addresses Flowy moved away from. Pages there go to the current address, so
// nobody keeps a second copy (and a second push subscription) on the old one.
// /api stays: the reminders cron still calls the old address. /sw.js stays so
// the old worker can update and drop its subscription (see public/sw.js).
const RETIRED_HOSTS = new Set(["flowy-mauve.vercel.app"]);
const CURRENT_ORIGIN = "https://useflowy.vercel.app";

/** The address the person typed. On Vercel, request.nextUrl carries the deployment's own host instead. */
function requestedHost(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  return host.split(",")[0]!.trim().toLowerCase().replace(/:\d+$/, "");
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (
    RETIRED_HOSTS.has(requestedHost(request)) &&
    !pathname.startsWith("/api/") &&
    pathname !== "/sw.js"
  ) {
    return NextResponse.redirect(`${CURRENT_ORIGIN}${pathname}${search}`, 308);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
