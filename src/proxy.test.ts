// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(() => new Response("app", { status: 200 })),
}));

import { resetRateLimit } from "@/lib/rate-limit";
import { proxy } from "@/proxy";

// As on Vercel: the URL carries the deployment's host, the headers the typed one.
const request = (host: string, path: string, ip = "1.2.3.4") =>
  new NextRequest(`https://flowy-abc123-markos-projects.vercel.app${path}`, {
    headers: { host, "x-forwarded-host": host, "x-real-ip": ip },
  });

describe("proxy", () => {
  beforeEach(resetRateLimit);

  it("serves the app on the current address", async () => {
    const response = await proxy(request("useflowy.vercel.app", "/app?view=today"));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends pages on the old address to the new one, keeping the path", async () => {
    const response = await proxy(request("flowy-mauve.vercel.app", "/app?view=today"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://useflowy.vercel.app/app?view=today");
  });

  it("keeps reminders of apps installed on the old address working", async () => {
    expect((await proxy(request("flowy-mauve.vercel.app", "/sw.js"))).status).toBe(200);
    expect((await proxy(request("flowy-mauve.vercel.app", "/api/notification-action"))).status).toBe(200);
  });

  it("pauses an address that floods the API", async () => {
    for (let i = 0; i < 60; i++) await proxy(request("useflowy.vercel.app", "/api/calendar/feed", "9.9.9.9"));
    expect((await proxy(request("useflowy.vercel.app", "/api/calendar/feed", "9.9.9.9"))).status).toBe(429);
    expect((await proxy(request("useflowy.vercel.app", "/api/calendar/feed", "8.8.8.8"))).status).toBe(200);
  });
});
