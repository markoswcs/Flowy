"use client";

import { useSyncExternalStore } from "react";

import type { PlacedTopic } from "@/features/mindmap/types";
import { TOOLS, type ToolId } from "@/features/mindmap/components/tools";
import type { ViewportStore } from "@/features/mindmap/components/viewport-store";
import { cn } from "@/lib/utils";

const ACTIONS: ToolId[] = [
  "child",
  "sibling",
  "edit",
  "format",
  "note",
  "delete",
];
const GAP = 10;
const BAR_HEIGHT = 44;

/**
 * Small floating bar above the selected topic with the actions people use
 * most (MindMeister-style), so nobody has to hunt in the main toolbar.
 */
export function TopicQuickBar({
  placed,
  store,
  isRoot,
  onRun,
}: {
  placed: PlacedTopic;
  store: ViewportStore;
  isRoot: boolean;
  onRun: (id: ToolId) => void;
}) {
  const view = useSyncExternalStore(store.subscribeView, store.get, store.get);
  const left = (placed.x + placed.width / 2) * view.k + view.x;
  const top = placed.y * view.k + view.y;
  const below = top < BAR_HEIGHT + GAP + 64;
  const y = below
    ? (placed.y + placed.height) * view.k + view.y + GAP
    : top - GAP - BAR_HEIGHT;
  const actions = isRoot
    ? ACTIONS.filter((id) => id !== "delete" && id !== "sibling")
    : ACTIONS;

  return (
    <div
      role="toolbar"
      aria-label="Ações do tópico"
      className="flowy-glass flowy-glass-strong pointer-events-auto absolute z-20 hidden -translate-x-1/2 animate-in items-center gap-0.5 rounded-2xl border p-1 fade-in zoom-in-95 md:flex"
      style={{ left, top: y, height: BAR_HEIGHT }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {actions.map((id) => {
        const tool = TOOLS[id];
        const Icon = tool.icon;
        const primary = id === "child";
        return (
          <button
            key={id}
            type="button"
            onClick={() => onRun(id)}
            aria-label={tool.label}
            title={
              tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label
            }
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              primary &&
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
              tool.danger && "hover:bg-destructive/10 hover:text-destructive",
            )}
          >
            <Icon className="size-4" />
            {primary || id === "format" ? (
              <span>{primary ? "Subtópico" : "Estilo"}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
