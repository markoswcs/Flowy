"use client";

import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

export function OnlineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-[90] flex min-h-8 items-center justify-center gap-2 bg-foreground px-3 text-center text-xs text-background"
      role="status"
    >
      <WifiOff className="size-3.5" />
      Você está offline. Alterações compatíveis serão sincronizadas ao
      reconectar.
    </div>
  );
}
