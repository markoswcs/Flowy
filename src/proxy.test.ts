// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(() => new Response("app", { status: 200 })),
}));

import { proxy } from "@/proxy";

// As on Vercel: the URL carries the deployment's host, the headers the typed one.
const request = (host: string, path: string) =>
  new NextRequest(`https://flowy-abc123-markos-projects.vercel.app${path}`, {
    headers: { host, "x-forwarded-host": host },
  });

describe("proxy", () => {
  it("serves the app on the old address too, without sending people away", async () => {
    for (const host of ["useflowy.vercel.app", "flowy-mauve.vercel.app"]) {
      const response = await proxy(request(host, "/app?view=today"));
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });
});
