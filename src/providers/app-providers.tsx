"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { NetworkStatus } from "@/components/ui/network-status";
import { clearTaskCache } from "@/features/tasks/task-cache";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { NotificationProvider } from "@/providers/notification-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1")
      .catch(() => {
        // Offline support and push are optional; the app works without them.
      });

    // The page may have opened from the copy the service worker keeps.
    let touched = false;
    const markTouched = () => {
      touched = true;
    };
    const handleMessage = (event: MessageEvent<{ type?: string; url?: string }>) => {
      if (event.data?.type === "flowy:signed-out") {
        clearTaskCache();
        window.location.replace(event.data.url || "/login");
      }
      // A newer build is out: switch now unless the person already started
      // using this copy (the next opening gets the new one anyway).
      if (event.data?.type === "flowy:new-version" && !touched) {
        window.location.reload();
      }
    };
    window.addEventListener("pointerdown", markTouched, { once: true });
    window.addEventListener("keydown", markTouched, { once: true });
    navigator.serviceWorker.addEventListener("message", handleMessage);
    // Asks for news that arrived before this listener existed.
    void navigator.serviceWorker.ready.then((registration) =>
      registration.active?.postMessage({ type: "flowy:ready" }),
    );
    return () => {
      window.removeEventListener("pointerdown", markTouched);
      window.removeEventListener("keydown", markTouched);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="purple"
      enableSystem={false}
      storageKey="flowy:theme"
      themes={["purple", "black", "oled", "white"]}
    >
      <QueryProvider><NotificationProvider>{children}</NotificationProvider></QueryProvider>
      <NetworkStatus />
    </ThemeProvider>
  );
}
