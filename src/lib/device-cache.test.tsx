import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearDeviceCache, PAGE_CACHE, useDeviceCache } from "./device-cache";

const folders = [{ id: "f1", name: "Casa" }];

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

// Test files share one jsdom (isolate: false): start from empty storage and
// only look at this module's keys.
const cacheKeys = () =>
  Object.keys(window.localStorage).filter((key) => key.startsWith("flowy:shell-cache:"));

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("useDeviceCache", () => {
  it("fills an empty query with this account's saved copy, marked as stale", () => {
    window.localStorage.setItem(
      "flowy:shell-cache:u1:folders",
      JSON.stringify({ savedAt: 1000, value: folders }),
    );
    const { queryClient, wrapper } = setup();

    renderHook(() => useDeviceCache("folders", "u1", ["folders", "list"], undefined), { wrapper });

    expect(queryClient.getQueryData(["folders", "list"])).toEqual(folders);
    expect(queryClient.getQueryState(["folders", "list"])?.dataUpdatedAt).toBe(1000);
  });

  it("ignores the copy of another account", () => {
    window.localStorage.setItem(
      "flowy:shell-cache:u2:folders",
      JSON.stringify({ savedAt: 1000, value: folders }),
    );
    const { queryClient, wrapper } = setup();

    renderHook(() => useDeviceCache("folders", "u1", ["folders", "list"], undefined), { wrapper });

    expect(queryClient.getQueryData(["folders", "list"])).toBeUndefined();
  });

  it("saves fresh data under the account", () => {
    const { wrapper } = setup();

    renderHook(() => useDeviceCache("folders", "u1", ["folders", "list"], folders), { wrapper });

    expect(cacheKeys()).toEqual(["flowy:shell-cache:u1:folders"]);
    expect(JSON.parse(window.localStorage.getItem(cacheKeys()[0]!)!).value).toEqual(folders);
  });

  it("clearDeviceCache removes the copies and the offline pages", () => {
    window.localStorage.setItem("flowy:shell-cache:u1:folders", "{}");
    window.localStorage.setItem("flowy:theme", "purple");
    const remove = vi.fn().mockResolvedValue(true);
    vi.stubGlobal("caches", { delete: remove });

    clearDeviceCache();

    expect(cacheKeys()).toEqual([]);
    expect(window.localStorage.getItem("flowy:theme")).toBe("purple");
    expect(remove).toHaveBeenCalledWith(PAGE_CACHE);
  });
});
