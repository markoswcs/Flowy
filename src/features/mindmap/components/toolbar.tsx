"use client";

import { Download, LayoutGrid, Palette, X } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

import type { LayoutKind, ThemeId } from "@/features/mindmap/types";
import { LAYOUT_OPTIONS } from "@/features/mindmap/components/constants";
import { ThemeList } from "@/features/mindmap/components/format-panel";
import { LayoutIcon } from "@/features/mindmap/components/layout-icon";
import { MenuItem, Popover } from "@/features/mindmap/components/popover";
import {
  EXPORT_TOOLS,
  isToolActive,
  isToolDisabled,
  TOOLS,
  type ToolId,
  type ToolState,
} from "@/features/mindmap/components/tools";
import type { ViewportStore } from "@/features/mindmap/components/viewport-store";
import { cn } from "@/lib/utils";

export interface ToolbarProps {
  state: ToolState;
  layout: LayoutKind;
  theme: ThemeId;
  onRun: (id: ToolId) => void;
  onLayout: (layout: LayoutKind) => void;
  onTheme: (theme: ThemeId) => void;
}

function ToolButton({
  id,
  state,
  onRun,
  large,
}: {
  id: ToolId;
  state: ToolState;
  onRun: (id: ToolId) => void;
  large?: boolean;
}) {
  const tool = TOOLS[id];
  const Icon = tool.icon;
  const active = isToolActive(id, state);
  const title = tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label;
  return (
    <button
      type="button"
      onClick={() => onRun(id)}
      disabled={isToolDisabled(id, state)}
      aria-label={tool.label}
      aria-pressed={id === "link" || id === "format" ? active : undefined}
      title={title}
      className={cn(
        "grid shrink-0 place-items-center rounded-xl text-muted-foreground transition-[transform,background-color,color] duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none",
        large ? "size-11" : "size-10",
        active && "bg-primary/15 text-primary ring-1 ring-primary/40",
        tool.danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}

function Divider() {
  return (
    <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
  );
}

function LayoutMenu({
  layout,
  onLayout,
}: {
  layout: LayoutKind;
  onLayout: (layout: LayoutKind) => void;
}) {
  const current = LAYOUT_OPTIONS.find((option) => option.id === layout);
  return (
    <Popover
      label="Layout"
      text={current?.label}
      icon={<LayoutIcon layout={layout} />}
    >
      {(close) =>
        LAYOUT_OPTIONS.map((option) => (
          <MenuItem
            key={option.id}
            icon={<LayoutIcon layout={option.id} />}
            label={option.label}
            active={option.id === layout}
            onSelect={() => {
              onLayout(option.id);
              close();
            }}
          />
        ))
      }
    </Popover>
  );
}

function ThemeMenu({
  theme,
  onTheme,
}: {
  theme: ThemeId;
  onTheme: (theme: ThemeId) => void;
}) {
  return (
    <Popover
      label="Tema do mapa"
      icon={<Palette className="size-[18px]" />}
      className="w-64"
    >
      {(close) => (
        <ThemeList
          value={theme}
          onChange={(next) => {
            onTheme(next);
            close();
          }}
        />
      )}
    </Popover>
  );
}

function ExportMenu({
  onRun,
  align = "start",
}: {
  onRun: (id: ToolId) => void;
  align?: "start" | "end";
}) {
  return (
    <Popover
      label="Exportar"
      icon={<Download className="size-[18px]" />}
      align={align}
    >
      {(close) =>
        EXPORT_TOOLS.map((id) => {
          const Icon = TOOLS[id].icon;
          return (
            <MenuItem
              key={id}
              icon={<Icon className="size-4" />}
              label={TOOLS[id].label}
              onSelect={() => {
                close();
                onRun(id);
              }}
            />
          );
        })
      }
    </Popover>
  );
}

export function DesktopToolbar({
  state,
  layout,
  theme,
  onRun,
  onLayout,
  onTheme,
}: ToolbarProps) {
  const group = (ids: ToolId[]) =>
    ids.map((id) => (
      <ToolButton key={id} id={id} state={state} onRun={onRun} />
    ));
  return (
    <nav
      aria-label="Ferramentas do mapa"
      className="flowy-glass flowy-glass-strong absolute left-1/2 top-3 z-20 hidden max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-0.5 rounded-2xl border p-1.5 md:flex"
    >
      {group(["undo", "redo"])}
      <Divider />
      {group(["child", "sibling", "parent", "delete"])}
      <Divider />
      {group(["collapse-all", "expand-all", "auto-arrange", "link"])}
      <Divider />
      <LayoutMenu layout={layout} onLayout={onLayout} />
      <ThemeMenu theme={theme} onTheme={onTheme} />
      {group(["template"])}
      <ExportMenu onRun={onRun} />
      <Divider />
      {group(["format"])}
    </nav>
  );
}

export function ZoomControls({
  store,
  onRun,
}: {
  store: ViewportStore;
  onRun: (id: ToolId) => void;
}) {
  const zoom = useSyncExternalStore(
    store.subscribe,
    store.getZoom,
    store.getZoom,
  );
  const state: ToolState = {
    canUndo: true,
    canRedo: true,
    hasTopic: true,
    linking: false,
    formatOpen: false,
  };
  return (
    <div className="flowy-glass absolute bottom-4 right-4 z-20 hidden items-center gap-0.5 rounded-2xl border p-1 md:flex">
      <ToolButton id="zoom-out" state={state} onRun={onRun} />
      <span
        className="min-w-12 text-center text-xs font-semibold tabular-nums text-muted-foreground"
        aria-live="polite"
      >
        {Math.round(zoom * 100)}%
      </span>
      <ToolButton id="zoom-in" state={state} onRun={onRun} />
      <Divider />
      <ToolButton id="fit" state={state} onRun={onRun} />
      <ToolButton id="center" state={state} onRun={onRun} />
    </div>
  );
}

// The phone bar changes with the selection, so every button is usable.
const MOBILE_BAR_IDLE: ToolId[] = ["undo", "redo", "fit", "template"];
const MOBILE_BAR_TOPIC: ToolId[] = ["child", "sibling", "edit", "format"];

function BarButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  expanded,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      aria-label={label}
      className={cn(
        "flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] font-medium leading-none transition-[transform,background-color,color] duration-200 active:scale-90 disabled:opacity-35 motion-reduce:transform-none",
        active
          ? "bg-primary/15 text-primary"
          : "text-foreground/80 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
      )}
    >
      {icon}
      <span className="max-w-full truncate px-0.5">{label}</span>
    </button>
  );
}

const SHEET_GROUPS: { title: string; tools: ToolId[] }[] = [
  {
    title: "Tópico",
    tools: ["edit", "parent", "duplicate", "delete", "format", "note"],
  },
  {
    title: "Mapa",
    tools: [
      "auto-arrange",
      "collapse-all",
      "expand-all",
      "template",
      "fit",
      "center",
    ],
  },
  { title: "Exportar", tools: [...EXPORT_TOOLS, "trash"] },
];

interface MobileToolbarProps extends ToolbarProps {
  sheetOpen: boolean;
  onToggleSheet: () => void;
}

function SheetButton({
  id,
  state,
  onRun,
}: {
  id: ToolId;
  state: ToolState;
  onRun: (id: ToolId) => void;
}) {
  const tool = TOOLS[id];
  const Icon = tool.icon;
  return (
    <button
      type="button"
      disabled={isToolDisabled(id, state)}
      onClick={() => onRun(id)}
      className={cn(
        "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl bg-muted/40 px-1 py-2 text-[11px] font-medium text-muted-foreground transition-transform active:scale-95 disabled:opacity-40 motion-reduce:transform-none",
        isToolActive(id, state) && "bg-primary/15 text-primary",
        tool.danger && "text-destructive",
      )}
    >
      <Icon className="size-5" />
      <span className="w-full truncate text-center leading-tight">
        {tool.short ?? tool.label}
      </span>
    </button>
  );
}

export function MobileToolbar({
  state,
  layout,
  theme,
  onRun,
  onLayout,
  onTheme,
  sheetOpen,
  onToggleSheet,
}: MobileToolbarProps) {
  return (
    <>
      {sheetOpen ? (
        <div
          className="flowy-glass flowy-glass-strong absolute inset-x-2 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)] z-30 mx-auto max-w-md max-h-[62%] animate-in fade-in slide-in-from-bottom-3 overflow-y-auto overscroll-contain rounded-3xl border p-3 md:hidden"
          role="dialog"
          aria-label="Mais ferramentas"
        >
          {!state.hasTopic ? (
            <p className="mb-3 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              Toque em um tópico para liberar as ferramentas de edição.
            </p>
          ) : null}
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Layout
          </p>
          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={layout === option.id}
                onClick={() => onLayout(option.id)}
                className={cn(
                  "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl bg-muted/40 px-1 text-[11px] font-medium text-muted-foreground",
                  layout === option.id && "bg-primary/15 text-primary",
                )}
              >
                <LayoutIcon layout={option.id} className="size-5" />
                <span className="line-clamp-2 w-full text-center leading-tight">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
          {SHEET_GROUPS.map((group) => (
            <div key={group.title} className="mb-3">
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.title}
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {group.tools.map((id) => (
                  <SheetButton key={id} id={id} state={state} onRun={onRun} />
                ))}
              </div>
            </div>
          ))}
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Tema
          </p>
          <ThemeList value={theme} onChange={onTheme} />
        </div>
      ) : null}
      <nav
        aria-label="Ferramentas do mapa"
        className="flowy-glass flowy-glass-strong absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto grid max-w-md grid-cols-5 items-center gap-1 rounded-[1.75rem] border p-1.5 md:hidden"
      >
        <div
          key={state.hasTopic ? "topic" : "idle"}
          className="col-span-4 grid animate-in grid-cols-4 items-center gap-1 fade-in slide-in-from-bottom-1"
        >
          {(state.hasTopic ? MOBILE_BAR_TOPIC : MOBILE_BAR_IDLE).map((id) => {
            const tool = TOOLS[id];
            const Icon = tool.icon;
            return (
              <BarButton
                key={id}
                icon={<Icon className="size-5" />}
                label={tool.short ?? tool.label}
                active={isToolActive(id, state)}
                disabled={isToolDisabled(id, state)}
                onClick={() => onRun(id)}
              />
            );
          })}
        </div>
        <div className="flex">
          <BarButton
            icon={
              sheetOpen ? (
                <X className="size-5" />
              ) : (
                <LayoutGrid className="size-5" />
              )
            }
            label={sheetOpen ? "Fechar" : "Mais"}
            active={sheetOpen}
            expanded={sheetOpen}
            onClick={onToggleSheet}
          />
        </div>
      </nav>
    </>
  );
}
