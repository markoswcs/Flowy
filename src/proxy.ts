import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Every address of Flowy (useflowy.vercel.app and the older
// flowy-mauve.vercel.app) serves the full app: apps installed from either keep
// working, signing in and receiving reminders. A phone subscribed on both
// addresses is deduplicated by register_push_subscription.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4)$).*)",
  ],
};
