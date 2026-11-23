"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FeatureTip } from "@/components/feature-tip";
import { parseSection } from "@/features/notes/note-sections";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { DOCK_ITEMS, placeInDock, resolveDock } from "./dock-items";
import { useDock, useSaveDock } from "./use-dock";

const HOLD_MS = 450;

function NavItem({
  label,
  href,
  active,
  icon,
  editing,
  onHold,
}: {
  label: string;
  href: string;
  active: boolean;
  icon: ReactNode;
  editing: boolean;
  onHold: () => void;
}) {
  const timer = useRef<number | null>(null);
  const held = useRef(false);

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <Link
      href={href}
      aria-label={label}
      title={`${label} (segure para trocar)`}
      aria-current={active ? "page" : undefined}
      // The ring already marks the active tab; the travelling glow stuck on
      // touch screens and doubled the indicator.
      data-no-glow
      onPointerDown={() => {
        held.current = false;
        cancel();
        timer.current = window.setTimeout(() => {
          held.current = true;
          navigator.vibrate?.(15);
          onHold();
        }, HOLD_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        // A hold opens the editor; it must not also open the page.
        if (held.current) {
          event.preventDefault();
          held.current = false;
        }
      }}
      className="relative grid h-full select-none place-items-center rounded-2xl transition-transform [-webkit-touch-callout:none] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
    >
      <span
        className={cn(
          "grid place-items-center transition-all duration-300",
          active ? "flowy-prism size-10" : "h-10 w-14 rounded-2xl text-muted-foreground hover:text-foreground",
          editing && "scale-110 bg-primary/15 text-foreground",
        )}
      >
        {icon}
      </span>
    </Link>
  );
}

/** The list that opens when a shortcut is held: pick what goes in that place. */
function DockPicker({ slot, keys, onClose }: { slot: number; keys: string[]; onClose: () => void }) {
  const save = useSaveDock();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function choose(key: string) {
    if (key !== keys[slot]) {
      save.mutate(placeInDock(keys, slot, key), { onError: () => toast.error("Não foi possível salvar. Tente de novo.") });
    }
    onClose();
  }

  return (
    <>
      <button type="button" aria-label="Fechar" onClick={onClose} className="fixed inset-0 z-30 animate-in fade-in bg-black/40 md:hidden" />
      <div
        role="dialog"
        aria-label="Trocar atalho"
        className="fixed inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5rem)] z-50 animate-in fade-in slide-in-from-bottom-2 rounded-[1.75rem] border border-border/60 bg-card p-3 shadow-2xl md:hidden"
      >
        <p className="px-1 pb-2 text-sm font-semibold">Trocar este atalho por</p>
        <div className="grid grid-cols-4 gap-1.5">
          {DOCK_ITEMS.map((item) => {
            const Icon = item.icon;
            const here = keys[slot] === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => choose(item.key)}
                aria-pressed={here}
                data-no-glow
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-medium transition-colors active:scale-95",
                  here ? "bg-primary/15 text-foreground ring-1 ring-primary/50" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="w-full truncate text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** Bottom bar on phones: four shortcuts around the create button. Hold one to swap it. */
export function MobileNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const place = { pathname, section: parseSection(params.get("tipo")), view: params.get("view") };
  const dock = useDock();
  const items = resolveDock(dock.data);
  const keys = items.map((entry) => entry.key);
  const [editing, setEditing] = useState<number | null>(null);

  const item = (index: number) => {
    const entry = items[index]!;
    const Icon = entry.icon;
    return (
      <NavItem
        key={entry.key}
        label={entry.label}
        href={entry.href}
        active={entry.active(place)}
        icon={<Icon className="size-5" />}
        editing={editing === index}
        onHold={() => setEditing(index)}
      />
    );
  };

  return (
    <>
      {editing !== null ? <DockPicker slot={editing} keys={keys} onClose={() => setEditing(null)} /> : null}
      <nav
        data-tour="nav"
        aria-label="Navegação móvel"
        className="flowy-mobile-nav fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
      >
        <div className="grid h-[4.25rem] grid-cols-[1fr_1fr_4.75rem_1fr_1fr] items-center flowy-glass rounded-[2rem] border px-2">
          <FeatureTip
            id="barra-segurar"
            title="Troque os atalhos"
            text="Segure qualquer botão desta barra e escolha outro atalho para ficar no lugar."
            align="start"
            className="h-full"
          >
            {item(0)}
          </FeatureTip>
          {item(1)}
          {/* The create button floats in this slot. */}
          <span aria-hidden="true" />
          {item(2)}
          {item(3)}
        </div>
      </nav>
    </>
  );
}
