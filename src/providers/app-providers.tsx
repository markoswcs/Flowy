"use client";

import type { ReactNode } from "react";

import { NetworkStatus } from "@/components/ui/network-status";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>{children}</QueryProvider>
      <NetworkStatus />
      <ToastProvider />
    </ThemeProvider>
  );
}
