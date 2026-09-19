"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useOnlineStatus } from "@/hooks/use-online-status";

export function NetworkStatus() {
  const online = useOnlineStatus();
  const previousOnline = useRef(online);

  useEffect(() => {
    if (!previousOnline.current && online) {
      toast.success("Conexão restaurada.");
    }
    previousOnline.current = online;
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground shadow-soft md:bottom-5"
    >
      <WifiOff className="size-3.5" aria-hidden="true" />
      Você está offline
    </div>
  );
}
