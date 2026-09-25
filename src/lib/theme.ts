import type { ThemePreference } from "@/types/content";

export const themePreferences = ["purple", "black", "oled", "white"] as const;

export function normalizeThemePreference(value: unknown): ThemePreference {
  return themePreferences.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : "purple";
}
