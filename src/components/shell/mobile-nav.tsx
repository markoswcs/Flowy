"use client";

import { Home, NotebookPen, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function MobileNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação móvel"
      className="theme-shell-panel safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/50 md:hidden"
    >
      <div className="grid h-16 grid-cols-4">
        <Link
          href="/app"
          aria-current={pathname === "/app" ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none",
            pathname === "/app" && "text-primary",
          )}
        >
          <Home className="size-5" aria-hidden="true" />
          <span>Início</span>
        </Link>

        <div className="flex justify-center" aria-hidden="true" />

        <Link
          href="/app/notes"
          aria-current={pathname.startsWith("/app/notes") ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none",
            pathname.startsWith("/app/notes") && "text-primary",
          )}
        >
          <NotebookPen className="size-5" aria-hidden="true" />
          <span>Notas</span>
        </Link>
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-0 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
          aria-label="Abrir menu"
        >
          <PanelLeftOpen className="size-5" aria-hidden="true" />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
