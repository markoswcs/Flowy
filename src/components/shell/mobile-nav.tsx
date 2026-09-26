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
      className="theme-shell-panel safe-bottom fixed inset-x-4 bottom-3 z-40 overflow-hidden rounded-[1.75rem] border border-border/70 shadow-lg shadow-black/20 md:hidden"
    >
      <div className="grid h-[4.5rem] grid-cols-3 px-4">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex min-w-0 flex-col items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
          aria-label="Abrir menu"
        >
          <span className="grid size-10 place-items-center rounded-full bg-muted/70 transition-transform active:scale-90">
            <PanelLeftOpen className="size-5" aria-hidden="true" />
          </span>
          <span>Menu</span>
        </button>
        <Link
          href="/app"
          aria-current={pathname === "/app" ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-col items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none",
            pathname === "/app" && "text-primary",
          )}
        >
          <span
            className={cn(
              "grid size-10 place-items-center rounded-full bg-muted/70 transition-all duration-200 active:scale-90",
              pathname === "/app" && "bg-primary text-primary-foreground shadow-sm shadow-primary/30",
            )}
          >
            <Home className="size-5" aria-hidden="true" />
          </span>
          <span>Início</span>
        </Link>
        <Link
          href="/app/notes"
          aria-current={pathname.startsWith("/app/notes") ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-col items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none",
            pathname.startsWith("/app/notes") && "text-primary",
          )}
        >
          <span
            className={cn(
              "grid size-10 place-items-center rounded-full bg-muted/70 transition-all duration-200 active:scale-90",
              pathname.startsWith("/app/notes") && "bg-primary text-primary-foreground shadow-sm shadow-primary/30",
            )}
          >
            <NotebookPen className="size-5" aria-hidden="true" />
          </span>
          <span>Notas</span>
        </Link>
      </div>
    </nav>
  );
}
