"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PopoverProps {
  label: string;
  icon: ReactNode;
  /** Visible text next to the icon (desktop toolbar). */
  text?: string;
  align?: "start" | "end";
  side?: "top" | "bottom";
  className?: string;
  children: (close: () => void) => ReactNode;
}

/** Minimal dropdown: closes on outside press and Escape. */
export function Popover({
  label,
  icon,
  text,
  align = "start",
  side = "bottom",
  className,
  children,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-accent text-foreground",
        )}
      >
        {icon}
        {text ? (
          <span className="hidden whitespace-nowrap xl:inline">{text}</span>
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "flowy-glass flowy-glass-strong absolute z-50 max-h-[min(70vh,34rem)] min-w-56 animate-scale-in overflow-y-auto overscroll-contain rounded-2xl border p-1.5",
            side === "bottom"
              ? "top-[calc(100%+8px)]"
              : "bottom-[calc(100%+8px)]",
            align === "start" ? "left-0" : "right-0",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

interface MenuItemProps {
  icon?: ReactNode;
  label: string;
  hint?: string;
  active?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

export function MenuItem({
  icon,
  label,
  hint,
  active,
  danger,
  onSelect,
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className={cn(
        "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
        active && "bg-primary/10 font-semibold text-primary",
        danger && "text-destructive",
      )}
    >
      {icon ? (
        <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
      ) : null}
      <span className="flex-1">{label}</span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </button>
  );
}
