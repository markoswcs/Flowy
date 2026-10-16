"use client";

import { Home, NotebookPen, Settings, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function NavItem({
  label,
  href,
  active,
  icon,
}: {
  label: string;
  href: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
      className="relative grid h-full place-items-center rounded-2xl transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
    >
      <span
        className={cn(
          "grid h-10 w-14 place-items-center rounded-2xl transition-all duration-300",
          active ? "bg-violet-500/15 text-violet-400" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {icon}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-1 size-1 rounded-full bg-violet-400 transition-all duration-300",
          active ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      />
    </Link>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const noteType = useSearchParams().get("tipo");
  const onNotes = pathname === "/app/notes";

  return (
    <nav
      data-tour="nav"
      aria-label="Navegação móvel"
      className="flowy-mobile-nav fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="grid h-[4.25rem] grid-cols-[1fr_1fr_4.75rem_1fr_1fr] items-center rounded-[2rem] border border-border/60 bg-card/95 px-2 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.65)] backdrop-blur-md">
        <NavItem label="Início" href="/app" active={pathname === "/app"} icon={<Home className="size-5" />} />
        <NavItem
          label="Notas"
          href="/app/notes?tipo=nota"
          active={onNotes && noteType !== "fluxo"}
          icon={<NotebookPen className="size-5" />}
        />
        {/* The create button floats in this slot. */}
        <span aria-hidden="true" />
        <NavItem
          label="Diagramas"
          href="/app/notes?tipo=fluxo"
          active={onNotes && noteType === "fluxo"}
          icon={<Workflow className="size-5" />}
        />
        <NavItem
          label="Configurações"
          href="/app/settings"
          active={pathname === "/app/settings"}
          icon={<Settings className="size-5" />}
        />
      </div>
    </nav>
  );
}
