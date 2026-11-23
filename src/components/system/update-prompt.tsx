"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { PAGE_CACHE } from "@/lib/device-cache";

const BUILD = `${process.env.NEXT_PUBLIC_APP_COMMIT ?? ""}-${process.env.NEXT_PUBLIC_APP_BUILT_AT ?? ""}`;
const CHECK_EVERY = 5 * 60_000;

let available = false;
const listeners = new Set<() => void>();

/** A newer build is out (from the service worker or the version check). */
export function markUpdateAvailable() {
  if (available) return;
  available = true;
  listeners.forEach((listener) => listener());
}

async function checkVersion() {
  if (process.env.NODE_ENV !== "production" || !navigator.onLine) return;
  try {
    const response = await fetch("/api/version", { cache: "no-store" });
    if (!response.ok) return;
    const { build } = (await response.json()) as { build?: string };
    if (build && build !== BUILD) markUpdateAvailable();
  } catch {
    // Offline or a blip: the next check tries again.
  }
}

/** Drops the saved copies of the pages so the reload brings the new build. */
async function update() {
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    await registration?.update();
    await window.caches?.delete(PAGE_CACHE);
  } catch {
    // Without a service worker a plain reload is enough.
  }
  window.location.reload();
}

/** "Nova versão do Flowy · Atualizar": a small pill when the open app is behind. */
export function UpdatePrompt() {
  const show = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => available,
    () => false,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void checkVersion();
    const timer = window.setInterval(() => void checkVersion(), CHECK_EVERY);
    // Coming back to the app (phones keep it open for days) checks at once.
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[150] flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-full border border-violet-400/40 bg-card/95 py-1.5 pl-4 pr-1.5 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2"
      >
        <span className="text-sm font-medium">Nova versão do Flowy</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void update();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
        >
          <RefreshCw className={busy ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />
          Atualizar
        </button>
      </div>
    </div>
  );
}
