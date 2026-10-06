"use client";

import { Home, NotebookPen, PanelLeftOpen, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export function MobileNav({ onOpenMenu, menuOpen }: { onOpenMenu: () => void; menuOpen: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const noteType = searchParams.get("tipo");

  const itemClass = "flex min-w-0 flex-col items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none";
  const iconClass = "grid size-10 place-items-center rounded-full bg-muted/70 transition-all duration-200 active:scale-90";

  return (
    <nav aria-label="Navegação móvel" className="theme-shell-panel safe-bottom fixed inset-x-3 bottom-3 z-40 overflow-visible rounded-[1.75rem] border border-border/70 shadow-lg shadow-black/20 md:hidden">
      <div className="grid h-[4.5rem] grid-cols-5 px-1">
        <button type="button" onClick={onOpenMenu} className={cn(itemClass, menuOpen && "text-primary")} aria-label="Abrir menu">
          <span className={cn(iconClass, menuOpen && "bg-primary text-primary-foreground shadow-lg shadow-primary/30")}><PanelLeftOpen className={cn("size-5 transition-transform duration-500", menuOpen && "rotate-180 scale-110")} aria-hidden="true" /></span>
          <span>Menu</span>
        </button>
        <Link href="/app/notes?tipo=nota" className={cn(itemClass, pathname === "/app/notes" && noteType !== "fluxo" && "text-primary")}>
          <span className={cn(iconClass, pathname === "/app/notes" && noteType !== "fluxo" && "bg-primary text-primary-foreground shadow-sm shadow-primary/30")}><NotebookPen className="size-5" aria-hidden="true" /></span>
          <span>Notas</span>
        </Link>
        <span aria-hidden="true" />
        <Link href="/app/notes?tipo=fluxo" className={cn(itemClass, pathname === "/app/notes" && noteType === "fluxo" && "text-primary")}>
          <span className={cn(iconClass, pathname === "/app/notes" && noteType === "fluxo" && "bg-primary text-primary-foreground shadow-sm shadow-primary/30")}><Workflow className="size-5" aria-hidden="true" /></span>
          <span>Fluxos</span>
        </Link>
        <Link href="/app" className={cn(itemClass, pathname === "/app" && "text-primary")}>
          <span className={cn(iconClass, pathname === "/app" && "bg-primary text-primary-foreground shadow-sm shadow-primary/30")}><Home className="size-5" aria-hidden="true" /></span>
          <span>Início</span>
        </Link>
      </div>
    </nav>
  );
}
