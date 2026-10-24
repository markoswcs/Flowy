"use client";

import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const PREFIX = "flowy:shell-cache:";
/** Cache Storage name used by public/sw.js for the app's pages. */
export const PAGE_CACHE = "flowy-pages-v1";

interface CachedValue<T> {
  savedAt: number;
  value: T;
}

/**
 * Like the task list cache: the side menu (folders, labels, counts, profile)
 * shows what it showed last time on this device the moment the app opens.
 * The copy keeps the time it was saved, so React Query still refetches it.
 */
export function useDeviceCache<T>(
  name: string,
  userId: string | undefined,
  queryKey: QueryKey,
  data: T | undefined,
) {
  const queryClient = useQueryClient();
  const key = userId ? `${PREFIX}${userId}:${name}` : null;
  const queryKeyHash = JSON.stringify(queryKey);

  useEffect(() => {
    if (!key) return;
    const parsedKey = JSON.parse(queryKeyHash) as QueryKey;
    if (queryClient.getQueryData(parsedKey) !== undefined) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const cached = JSON.parse(raw) as CachedValue<T>;
      queryClient.setQueryData(parsedKey, cached.value, { updatedAt: cached.savedAt });
    } catch {
      // Unreadable copy: the menu simply loads from the network.
    }
  }, [key, queryClient, queryKeyHash]);

  useEffect(() => {
    if (!key || data === undefined) return;
    try {
      const value: CachedValue<T> = { savedAt: Date.now(), value: data };
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: nothing to keep.
    }
  }, [key, data]);
}

/** Removes the side menu copies and the offline pages kept by the service worker. */
export function clearDeviceCache() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear when storage is blocked.
  }
  if ("caches" in window) {
    void window.caches.delete(PAGE_CACHE).catch(() => undefined);
  }
}
