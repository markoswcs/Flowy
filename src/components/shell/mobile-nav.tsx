"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FeatureTip } from "@/components/feature-tip";
import { parseSection } from "@/features/notes/note-sections";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

import { DOCK_ITEMS, placeInDock, resolveDock } from "./dock-items";
import { useDock, useSaveDock } from "./use-dock";

const HOLD_MS = 350;

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
  const router = useRouter();
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const [pressing, setPressing] = useState(false);

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  };

  // A button, not a link: on iPhone, holding a link hands the gesture to
  // Safari (link preview, drag) and our hold never finishes.
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (segure para trocar)`}
      aria-current={active ? "page" : undefined}
      // The ring already marks the active tab; no travelling glow on top.
      data-no-glow
      onPointerEnter={() => router.prefetch(href)}
      onPointerDown={(event) => {
        held.current = false;
        origin.current = { x: event.clientX, y: event.clientY };
        if (timer.current) window.clearTimeout(timer.current);
        setPressing(true);
        timer.current = window.setTimeout(() => {
          timer.current = null;
          held.current = true;
          setPressing(false);
          navigator.vibrate?.(15);
          onHold();
        }, HOLD_MS);
      }}
      onPointerMove={(event) => {
        if (!timer.current) return;
        const dx = event.clientX - origin.current.x;
        const dy = event.clientY - origin.current.y;
        if (dx * dx + dy * dy > 100) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        // A hold opens the editor; it must not also open the page.
        if (held.current) {
          held.current = false;
          return;
        }
        router.push(href);
      }}
      className="relative grid h-full w-full select-none place-items-center rounded-2xl [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] [touch-action:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
    >
      <span
        className={cn(
          "grid place-items-center transition-all",
          pressing ? "scale-90 duration-[350ms] ease-out" : "duration-200",
          active ? "flowy-prism size-10" : "h-10 w-14 rounded-2xl text-muted-foreground hover:text-foreground",
          pressing && !active && "bg-primary/15 text-foreground",
          editing && "scale-110 bg-primary/15 text-foreground",
        )}
      >
        {icon}
      </span>
    </button>
  );
}

/** The list that opens when a shortcut is held: pick what goes in that place. */
function DockPicker({ slot, keys, onClose }: { slot: number; keys: string[]; onClose: () => void }) {
  const save = useSaveDock();
  // The finger that held the button lifts right after the list opens; that
  // lift must not count as a tap on the backdrop (it closed the list at once).
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = performance.now();
  }, []);
  const closeFromBackdrop = () => {
    if (performance.now() - openedAt.current > 450) onClose();
  };

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
      <button type="button" aria-label="Fechar" onClick={closeFromBackdrop} className="fixed inset-0 z-30 animate-in fade-in bg-black/40 md:hidden" />
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
