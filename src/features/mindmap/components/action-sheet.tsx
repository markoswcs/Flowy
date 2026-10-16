"use client";

import { useEffect } from "react";

import { TOOLS, type ToolId } from "@/features/mindmap/components/tools";
import { cn } from "@/lib/utils";

const ACTIONS: ToolId[] = [
  "child",
  "sibling",
  "edit",
  "format",
  "note",
  "delete",
];

interface ActionSheetProps {
  x: number;
  y: number;
  title: string;
  onRun: (id: ToolId) => void;
  onClose: () => void;
}

/** Small menu opened by long-press (touch) or right-click on a topic. */
export function ActionSheet({ x, y, title, onRun, onClose }: ActionSheetProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  const left = Math.max(8, Math.min(x - 120, window.innerWidth - 248));
  const top = Math.max(8, Math.min(y + 12, window.innerHeight - 300));

  return (
    <div
      className="fixed inset-0 z-[90]"
      role="presentation"
      onPointerDown={onClose}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        role="menu"
        aria-label={`Ações para ${title}`}
        onPointerDown={(event) => event.stopPropagation()}
        className="flowy-glass flowy-glass-strong absolute w-60 animate-scale-in rounded-2xl border p-1.5"
        style={{ left, top }}
      >
        <p className="truncate px-3 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">
          {title}
        </p>
        {ACTIONS.map((id) => {
          const tool = TOOLS[id];
          const Icon = tool.icon;
          return (
            <button
              key={id}
              type="button"
              role="menuitem"
              onClick={() => {
                onClose();
                onRun(id);
              }}
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                tool.danger && "text-destructive",
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{tool.short ?? tool.label}</span>
              {tool.shortcut ? (
                <kbd className="hidden text-[11px] text-muted-foreground md:inline">
                  {tool.shortcut}
                </kbd>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
