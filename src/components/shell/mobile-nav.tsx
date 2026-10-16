"use client";

import { Home, Menu, NotebookPen, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function NavItem({
  label,
  active,
  icon,
  href,
  onClick,
}: {
  label: string;
  active: boolean;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span
        className={cn(
          "grid h-8 w-12 place-items-center rounded-full transition-all duration-300",
          active ? "bg-primary/15 text-primary" : "text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "text-[10px] font-medium leading-none transition-colors",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </>
  );
  const className =
    "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-1 transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return href ? (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} aria-expanded={active}>
      {content}
    </button>
  );
}

export function MobileNav({ onOpenMenu, menuOpen }: { onOpenMenu: () => void; menuOpen: boolean }) {
  const pathname = usePathname();
  const noteType = useSearchParams().get("tipo");
  const onNotes = pathname === "/app/notes";

  return (
    <nav
      data-tour="nav"
      aria-label="Navegação móvel"
      className="flowy-mobile-nav fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="grid h-16 grid-cols-5 items-center rounded-[1.6rem] border border-border/60 bg-card/85 px-1 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.65)] backdrop-blur-xl">
        <NavItem label="Menu" active={menuOpen} onClick={onOpenMenu} icon={<Menu className="size-[18px]" />} />
        <NavItem label="Início" href="/app" active={pathname === "/app"} icon={<Home className="size-[18px]" />} />
        {/* The create button floats in this slot. */}
        <span aria-hidden="true" />
        <NavItem
          label="Notas"
          href="/app/notes?tipo=nota"
          active={onNotes && noteType !== "fluxo"}
          icon={<NotebookPen className="size-[18px]" />}
        />
        <NavItem
          label="Diagramas"
          href="/app/notes?tipo=fluxo"
          active={onNotes && noteType === "fluxo"}
          icon={<Workflow className="size-[18px]" />}
        />
      </div>
    </nav>
  );
}
