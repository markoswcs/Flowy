// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
let signedIn = false;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession,
      getUser: async () => ({ data: { user: signedIn ? { id: "u1" } : null } }),
    },
  }),
}));

import { GET } from "./route";

const call = (query: string) => GET(new NextRequest(`https://useflowy.vercel.app/auth/callback?${query}`));

beforeEach(() => {
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  signedIn = false;
});

describe("auth callback", () => {
  it("finishes a Google sign-in and goes on", async () => {
    const response = await call("code=abc&next=%2Fapp");
    expect(response.headers.get("location")).toBe("https://useflowy.vercel.app/app");
  });

  it("explains a Google sign-in that did not finish", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("code verifier missing") });
    const response = await call("code=abc&next=%2Fapp");
    expect(response.headers.get("location")).toBe("https://useflowy.vercel.app/login?erro=google");
  });

  it("keeps the expired-link message for password reset", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("expired") });
    const response = await call("code=abc&next=%2Fredefinir-senha");
    expect(response.headers.get("location")).toBe("https://useflowy.vercel.app/login?erro=link-expirado");
  });

  it("lets someone already signed in go on", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("already used") });
    signedIn = true;
    const response = await call("code=abc&next=%2Fapp");
    expect(response.headers.get("location")).toBe("https://useflowy.vercel.app/app");
  });
});
