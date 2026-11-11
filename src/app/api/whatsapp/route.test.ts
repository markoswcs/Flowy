import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

beforeEach(() => {
  vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "verify-me");
  vi.stubEnv("WHATSAPP_APP_SECRET", "s3cret");
});
afterEach(() => vi.unstubAllEnvs());

describe("WhatsApp webhook", () => {
  it("answers Meta's check only with the right token", async () => {
    const ok = GET(new NextRequest("https://x/api/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("42");
    expect(GET(new NextRequest("https://x/api/whatsapp?hub.mode=subscribe&hub.verify_token=no&hub.challenge=42")).status).toBe(403);
  });

  it("refuses messages that are not signed by Meta", async () => {
    const response = await POST(
      new NextRequest("https://x/api/whatsapp", {
        method: "POST",
        body: "{}",
        headers: { "x-hub-signature-256": "sha256=forged" },
      }),
    );
    expect(response.status).toBe(401);
  });
});
