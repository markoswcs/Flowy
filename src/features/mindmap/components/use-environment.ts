"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 768px)";

function subscribeDesktop(callback: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function isDesktopViewport(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, isDesktopViewport, () => true);
}

function subscribeAppTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function isDarkAppTheme(): boolean {
  return !document.documentElement.classList.contains("white");
}

/** The app themes are purple/black/oled (dark) and white (light). */
export function useDarkCanvas(): boolean {
  return useSyncExternalStore(subscribeAppTheme, isDarkAppTheme, () => true);
}
