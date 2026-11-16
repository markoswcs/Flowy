import type { NextRequest } from "next/server";

/**
 * The address the person typed (useflowy.vercel.app), not the deployment's own
 * host that Vercel puts in the request URL.
 */
export function publicOrigin(request: NextRequest): string {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0]!.trim();
  if (!host) return request.nextUrl.origin;
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || (local ? "http" : "https");
  return `${protocol}://${host}`;
}
