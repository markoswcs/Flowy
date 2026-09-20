"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const active =
    pathname === item.href ||
    (item.href !== "/app" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "theme-sidebar-item flex min-h-[42px] items-center gap-3 rounded-2xl px-4 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:scale-[1.02]",
        active &&
          "theme-sidebar-active border border-primary/20 bg-primary/15 text-primary shadow-[0_0_20px_hsl(var(--primary)/0.2)]",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span>{item.label}</span>
      )}
    </Link>
  );
}
