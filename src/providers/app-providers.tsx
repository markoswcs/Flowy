"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { NetworkStatus } from "@/components/ui/network-status";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { NotificationProvider } from "@/providers/notification-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          // Offline support and push are optional; the app works without them.
        });
    }
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
