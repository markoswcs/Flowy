"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { normalizeThemePreference } from "@/lib/theme";

export function PersistedTheme({ theme }: { theme: unknown }) {
  const { setTheme } = useTheme();
  const normalizedTheme = normalizeThemePreference(theme);

  useEffect(() => {
    setTheme(normalizedTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
