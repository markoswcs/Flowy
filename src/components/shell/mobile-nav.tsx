"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { parseSection } from "@/features/notes/note-sections";
import { cn } from "@/lib/utils";

import { resolveDock } from "./dock-items";
import { useDock } from "./use-dock";

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
          "grid place-items-center transition-all duration-300",
          active ? "flowy-prism size-10" : "h-10 w-14 rounded-2xl text-muted-foreground hover:text-foreground",
        )}
      >
        {icon}
      </span>
    </Link>
  );
}

/** Bottom bar on phones: four shortcuts the person chooses (Configurações) around the create button. */
export function MobileNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const place = { pathname, section: parseSection(params.get("tipo")), view: params.get("view") };
  const dock = useDock();
  const items = resolveDock(dock.data);

  const item = (index: number) => {
    const entry = items[index]!;
    const Icon = entry.icon;
    return <NavItem key={entry.key} label={entry.label} href={entry.href} active={entry.active(place)} icon={<Icon className="size-5" />} />;
  };

  return (
    <nav
      data-tour="nav"
      aria-label="Navegação móvel"
      className="flowy-mobile-nav fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="grid h-[4.25rem] grid-cols-[1fr_1fr_4.75rem_1fr_1fr] items-center flowy-glass rounded-[2rem] border px-2">
        {item(0)}
        {item(1)}
        {/* The create button floats in this slot. */}
        <span aria-hidden="true" />
        {item(2)}
        {item(3)}
      </div>
    </nav>
  );
}
