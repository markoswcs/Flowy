import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIntroOffered } from "@/lib/intro-preferences";
import * as supabaseClient from "@/lib/supabase/client";

const auth = {
  metadata: {} as Record<string, unknown>,
  getUser: vi.fn(async () => ({ data: { user: { user_metadata: auth.metadata } } })),
  updateUser: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    auth.metadata = { ...auth.metadata, ...data };
    return { data: {}, error: null };
  }),
};

describe("useIntroOffered", () => {
  beforeEach(() => {
    // Tests share modules (isolate: false), so the client is spied, not mocked.
    vi.spyOn(supabaseClient, "createClient").mockReturnValue({
      auth: { getUser: auth.getUser, updateUser: auth.updateUser },
    } as unknown as ReturnType<typeof supabaseClient.createClient>);
    window.localStorage.clear();
    auth.metadata = {};
    auth.getUser.mockClear();
    auth.updateUser.mockClear();
  });

  it("offers the invite once to a new person", async () => {
    const { result } = renderHook(() => useIntroOffered("section:desenho"));
    expect(result.current[0]).toBeNull();
    await waitFor(() => expect(result.current[0]).toBe(true));
  });

  it("keeps a dismissal on the account and on this device", async () => {
    const { result } = renderHook(() => useIntroOffered("section:desenho"));
    await waitFor(() => expect(result.current[0]).toBe(true));
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    await waitFor(() =>
      expect(auth.updateUser).toHaveBeenCalledWith({ data: { dismissed_intros: ["section:desenho"] } }),
    );
    expect(window.localStorage.getItem("flowy:intro-dismissed:section:desenho")).toBe("1");
  });

  it("respects a dismissal made on another device", async () => {
    auth.metadata = { dismissed_intros: ["section:mapa"] };
    const { result } = renderHook(() => useIntroOffered("section:mapa"));
    await waitFor(() => expect(result.current[0]).toBe(false));
    expect(window.localStorage.getItem("flowy:intro-dismissed:section:mapa")).toBe("1");
  });

  it("carries over a dismissal saved by the old version", async () => {
    window.localStorage.setItem("flowy:intro:nota", "1");
    const { result } = renderHook(() => useIntroOffered("section:nota", ["flowy:intro:nota"]));
    await waitFor(() => expect(result.current[0]).toBe(false));
    await waitFor(() =>
      expect(auth.updateUser).toHaveBeenCalledWith({ data: { dismissed_intros: ["section:nota"] } }),
    );
  });
});
