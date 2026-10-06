"use client";

import { Home, NotebookPen, PanelLeftOpen, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

export function MobileNav({ onOpenMenu, menuOpen }: { onOpenMenu: () => void; menuOpen: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const noteType = searchParams.get("tipo");

  const itemClass = "relative grid min-w-0 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none";
  const iconClass = "grid size-11 place-items-center rounded-2xl transition-all duration-200 active:scale-90";

  return (
    <nav aria-label="Navegação móvel" className="theme-shell-panel safe-bottom fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 border-border/70 shadow-[0_-10px_30px_hsl(var(--background)/.28)] md:hidden">
      <div className="grid h-[4.75rem] grid-cols-5 px-3">
        <button type="button" onClick={onOpenMenu} className={cn(itemClass, menuOpen && "text-primary")} aria-label="Abrir menu" title="Menu">
          <span className={cn(iconClass, menuOpen && "bg-primary/12 text-primary")}><PanelLeftOpen className={cn("size-5 transition-transform duration-500", menuOpen && "rotate-180 scale-110")} aria-hidden="true" /></span>
        </button>
        <Link href="/app/notes?tipo=nota" className={cn(itemClass, pathname === "/app/notes" && noteType !== "fluxo" && "text-primary")} aria-label="Notas" title="Notas">
          <span className={cn(iconClass, pathname === "/app/notes" && noteType !== "fluxo" && "bg-primary/12 text-primary")}><NotebookPen className="size-5" aria-hidden="true" /></span>
        </Link>
        <span aria-hidden="true" />
        <Link href="/app/notes?tipo=fluxo" className={cn(itemClass, pathname === "/app/notes" && noteType === "fluxo" && "text-primary")} aria-label="Fluxos" title="Fluxos">
          <span className={cn(iconClass, pathname === "/app/notes" && noteType === "fluxo" && "bg-primary/12 text-primary")}><Workflow className="size-5" aria-hidden="true" /></span>
        </Link>
        <Link href="/app" className={cn(itemClass, pathname === "/app" && "text-primary")} aria-label="Início" title="Início">
          <span className={cn(iconClass, pathname === "/app" && "bg-primary/12 text-primary")}><Home className="size-5" aria-hidden="true" /></span>
        </Link>
      </div>
    </nav>
  );
}
