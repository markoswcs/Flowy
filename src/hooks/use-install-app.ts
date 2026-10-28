"use client";

import { useEffect, useRef, useState } from "react";

export function useInstallApp() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  // The browser's prompt can be shown once per event; a second tap while it
  // is open (or while Android builds the app) would only start another install.
  const prompting = useRef(false);

  useEffect(() => {
    // Check if it's already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInstalled(true);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt || prompting.current) return;
    prompting.current = true;
    const event = deferredPrompt;
    setDeferredPrompt(null);
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") {
        setIsInstallable(false);
        setIsInstalled(true);
      }
    } catch {
      // The event was already used: Chrome sends a new one when install is possible again.
      setIsInstallable(false);
    } finally {
      prompting.current = false;
    }
  };

  return { isInstallable, isInstalled, installApp };
}
