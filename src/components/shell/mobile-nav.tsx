"use client";

import { Home, Network, NotebookPen, PenTool } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { parseSection, SECTION_HREF } from "@/features/notes/note-sections";
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
      // The pill and dot already mark the active tab; the travelling glow
      // stuck on touch screens and doubled the indicator.
      data-no-glow
      className="relative grid h-full place-items-center rounded-2xl transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
    >
      <span
        className={cn(
          "grid h-10 w-14 place-items-center rounded-2xl transition-all duration-300",
          active
            ? "bg-foreground/[0.08] text-foreground [&_svg]:text-[var(--flowy-ink)]"
            : "text-muted-foreground hover:text-foreground",
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
  const section = parseSection(useSearchParams().get("tipo"));
  const onNotes = pathname === "/app/notes";

  return (
    <nav
      data-tour="nav"
      aria-label="Navegação móvel"
      className="flowy-mobile-nav fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="grid h-[4.25rem] grid-cols-[1fr_1fr_4.75rem_1fr_1fr] items-center flowy-glass rounded-[2rem] border px-2">
        <NavItem
          label="Início"
          href="/app"
          active={pathname === "/app"}
          icon={<Home className="size-5" />}
        />
        <NavItem
          label="Notas"
          href={SECTION_HREF.nota}
          active={onNotes && section === "nota"}
          icon={<NotebookPen className="size-5" />}
        />
        {/* The create button floats in this slot. */}
        <span aria-hidden="true" />
        <NavItem
          label="Mapas"
          href={SECTION_HREF.mapa}
          active={onNotes && section === "mapa"}
          icon={<Network className="size-5" />}
        />
        <NavItem
          label="Desenhos"
          href={SECTION_HREF.desenho}
          active={onNotes && section === "desenho"}
          icon={<PenTool className="size-5" />}
        />
      </div>
    </nav>
  );
}
