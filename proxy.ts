import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Addresses Flowy moved away from. Pages there go to the current address, so
// nobody keeps a second copy (and a second push subscription) on the old one.
// /api stays: the reminders cron still calls the old address. /sw.js stays so
// the old worker can update and drop its subscription (see public/sw.js).
const RETIRED_HOSTS = new Set(["flowy-mauve.vercel.app"]);
const CURRENT_ORIGIN = "https://useflowy.vercel.app";

export async function proxy(request: NextRequest) {
  const { hostname, pathname, search } = request.nextUrl;
  if (
    RETIRED_HOSTS.has(hostname) &&
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
