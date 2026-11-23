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
      // The prism ring marks the selected item; no travelling glow on top of it.
      data-no-glow={active ? "" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "theme-sidebar-item flowy-glow-hover flex min-h-[42px] items-center gap-3 rounded-2xl px-4 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "theme-sidebar-active flowy-prism-pill text-foreground",
        active && !collapsed && "pl-1.5",
        collapsed && "justify-center px-0",
      )}
    >
      {active ? (
        <span className="flowy-prism size-8 shrink-0">
          <Icon className="size-[17px]" aria-hidden="true" />
        </span>
      ) : (
        <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      )}
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span>{item.label}</span>
      )}
    </Link>
  );
}
