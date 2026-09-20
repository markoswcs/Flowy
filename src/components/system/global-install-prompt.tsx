"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useInstallApp } from "@/hooks/use-install-app";

export function GlobalInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = useInstallApp();
  const [dismissed, setDismissed] = useState(false);

  // Avoid hydration mismatch by rendering nothing initially
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || isInstalled || dismissed || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-500">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-white">Instalar Flowy</p>
          <p className="text-xs text-white/70">
            Adicione à sua tela inicial para acesso rápido e offline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={installApp}
          >
            <Download className="mr-1.5 size-3.5" />
            Instalar
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-white/50 hover:bg-white/10 hover:text-white"
            onClick={() => setDismissed(true)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
