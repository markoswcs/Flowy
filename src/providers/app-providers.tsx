"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { NetworkStatus } from "@/components/ui/network-status";
import { themePreferences } from "@/lib/theme";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered.", reg))
        .catch((err) => console.error("Service Worker registration failed.", err));
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="purple"
      enableSystem={false}
      storageKey="flowy:theme"
      themes={["purple", "black", "white"]}
    >
      <QueryProvider>{children}</QueryProvider>
      <NetworkStatus />
      <ToastProvider />
    </ThemeProvider>
  );
}
