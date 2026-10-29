// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(() => new Response("session", { status: 200 })),
}));

import { proxy } from "../../proxy";

// As on Vercel: the URL carries the deployment's host, the headers the typed one.
const deploymentUrl = "https://flowy-abc123-markos-projects.vercel.app";
const old = (path: string) =>
  new NextRequest(`${deploymentUrl}${path}`, {
    headers: { host: "flowy-mauve.vercel.app", "x-forwarded-host": "flowy-mauve.vercel.app" },
  });

describe("proxy on the retired address", () => {
  it("sends pages to the current address, keeping path and query", async () => {
    const response = await proxy(old("/app?view=today"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://useflowy.vercel.app/app?view=today");
  });

  it("keeps the reminders cron and the service worker on the old address", async () => {
    expect((await proxy(old("/api/cron/reminders"))).status).toBe(200);
    expect((await proxy(old("/sw.js"))).status).toBe(200);
  });

  it("leaves the current address alone", async () => {
    const response = await proxy(
      new NextRequest(`${deploymentUrl}/app`, { headers: { host: "useflowy.vercel.app" } }),
    );
    expect(response.status).toBe(200);
  });

  it("matches the old address whatever the case or port", async () => {
    const response = await proxy(
      new NextRequest(`${deploymentUrl}/login`, { headers: { host: "Flowy-Mauve.vercel.app:443" } }),
    );
    expect(response.headers.get("location")).toBe("https://useflowy.vercel.app/login");
  });
});
