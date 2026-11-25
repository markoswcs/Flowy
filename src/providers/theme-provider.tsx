"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, type ComponentProps } from "react";

/**
 * The phone's status bar and the strip under the app (Android, installed app)
 * take the page's theme-color: keep it equal to the chosen theme's background
 * instead of the fixed purple.
 */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    // Read the background the theme actually paints, after its class applies.
    const frame = window.requestAnimationFrame(() => {
      const color = getComputedStyle(document.body).backgroundColor;
      if (!color) return;
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      if (metas.length) metas.forEach((meta) => meta.setAttribute("content", color));
      else {
        const meta = document.createElement("meta");
        meta.name = "theme-color";
        meta.content = color;
        document.head.appendChild(meta);
      }
      document.documentElement.style.backgroundColor = color;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [resolvedTheme]);
  return null;
}

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}
