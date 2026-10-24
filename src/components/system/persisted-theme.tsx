"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import { usePreferences } from "@/features/settings/use-settings";
import { normalizeThemePreference } from "@/lib/theme";

/**
 * The theme saved on the account wins once it arrives; until then the copy
 * next-themes keeps on this device is already on screen.
 */
export function PersistedTheme() {
  const { setTheme } = useTheme();
  const savedTheme = usePreferences().data?.theme;

  useEffect(() => {
    if (savedTheme !== undefined) setTheme(normalizeThemePreference(savedTheme));
    // Only the account value matters: changes made here already call setTheme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTheme]);

  return null;
}
