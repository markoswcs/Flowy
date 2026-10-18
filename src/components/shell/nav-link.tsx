"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { parseSection } from "@/features/notes/note-sections";

import type { NavigationItem } from "@/components/shell/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  item,
  collapsed = false,
  onNavigate,
}: {
  item: NavigationItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [path, query] = item.href.split("?");
  const section = query ? new URLSearchParams(query).get("tipo") : null;
  const active = section
    ? pathname === path &&
      parseSection(searchParams.get("tipo")) === parseSection(section)
    : pathname === item.href ||
      (item.href !== "/app" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={() => {
        if (item.href === "/app") {
          window.dispatchEvent(new Event("flowy:close-overlays"));
        }
        onNavigate?.();
      }}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "theme-sidebar-item flowy-glow-hover flex min-h-[42px] items-center gap-3 rounded-2xl px-4 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:scale-[1.02]",
        active && "theme-sidebar-active bg-foreground/[0.07] text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon
        className={cn("size-[18px] shrink-0", active && "flowy-ink")}
        aria-hidden="true"
      />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span>{item.label}</span>
      )}
    </Link>
  );
}
