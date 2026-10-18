"use client";

import {
  Ellipsis,
  FolderOpen,
  LayoutGrid,
  Palette,
  Plus,
  X,
} from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

import type { LayoutKind, ThemeId } from "@/features/mindmap/types";
import { layoutOptionsFor } from "@/features/mindmap/components/constants";
import { ThemeList } from "@/features/mindmap/components/format-panel";
import { LayoutIcon } from "@/features/mindmap/components/layout-icon";
import { MenuItem, Popover } from "@/features/mindmap/components/popover";
import {
  EXPAND_TOOLS,
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

/** Tools that stay on/off; they get the rotating glow while on. */
const TOGGLE_TOOLS = new Set<ToolId>([
  "link",
  "format",
  "outline",
  "search",
  "focus",
]);

const FILE_TOOLS: ToolId[] = ["import", ...EXPORT_TOOLS];
const MORE_TOOLS: ToolId[] = [
  "parent",
  "duplicate",
  "floating",
  "copy-style",
  "paste-style",
  "auto-arrange",
  ...EXPAND_TOOLS,
  "template",
];

/** Main actions show their name next to the icon on wide screens. */
const LABELLED_TOOLS = new Set<ToolId>([
  "child",
  "sibling",
  "link",
  "boundary",
  "note",
  "delete",
  "search",
  "outline",
  "present",
  "format",
]);

function ToolButton({
  id,
  state,
  onRun,
  labelled = false,
}: {
  id: ToolId;
  state: ToolState;
  onRun: (id: ToolId) => void;
  labelled?: boolean;
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
      aria-pressed={TOGGLE_TOOLS.has(id) ? active : undefined}
      title={title}
      className={cn(
        "flex h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl text-muted-foreground transition-[transform,background-color,color] duration-150 hover:-translate-y-px hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 disabled:pointer-events-none disabled:opacity-35 motion-reduce:transform-none",
        labelled && "lg:h-12 lg:min-w-[3.25rem] lg:flex-col lg:gap-1 lg:px-2",
        active && "flowy-active",
        tool.danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {labelled ? (
        <span className="hidden whitespace-nowrap text-[11px] font-medium leading-none lg:block">
          {tool.short ?? tool.label}
        </span>
      ) : null}
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
  const options = layoutOptionsFor(layout);
  const current = options.find((option) => option.id === layout);
  return (
    <Popover
      label="Layout"
      text={current?.label}
      icon={<LayoutIcon layout={layout} />}
    >
      {(close) =>
        options.map((option) => (
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

function ToolMenu({
  label,
  icon,
  tools,
  state,
  onRun,
  align = "start",
}: {
  label: string;
  icon: ReactNode;
  tools: ToolId[];
  state: ToolState;
  onRun: (id: ToolId) => void;
  align?: "start" | "end";
}) {
  return (
    <Popover label={label} icon={icon} align={align}>
      {(close) =>
        tools
          .filter((id) => !isToolDisabled(id, state))
          .map((id) => {
            const Icon = TOOLS[id].icon;
            return (
              <MenuItem
                key={id}
                icon={<Icon className="size-4" />}
                label={TOOLS[id].label}
                hint={TOOLS[id].shortcut}
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
      <ToolButton
        key={id}
        id={id}
        state={state}
        onRun={onRun}
        labelled={LABELLED_TOOLS.has(id)}
      />
    ));
  return (
    <nav
      aria-label="Ferramentas do mapa"
      className="flowy-glass flowy-glass-strong absolute left-1/2 top-3 z-20 hidden max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-0.5 rounded-2xl border p-1.5 md:flex"
    >
      {group(["undo", "redo"])}
      <Divider />
      {group(["child", "sibling"])}
      <Divider />
      {group(["link", "boundary", "note"])}
      <Divider />
      {group(["delete"])}
      <Divider />
      <LayoutMenu layout={layout} onLayout={onLayout} />
      <ThemeMenu theme={theme} onTheme={onTheme} />
      <Divider />
      {group(["search", "outline", "focus", "present"])}
      <Divider />
      <ToolMenu
        label="Mais ações"
        icon={<Ellipsis className="size-[18px]" />}
        tools={MORE_TOOLS}
        state={state}
        onRun={onRun}
        align="end"
      />
      <ToolMenu
        label="Arquivo: importar e exportar"
        icon={<FolderOpen className="size-[18px]" />}
        tools={FILE_TOOLS}
        state={state}
        onRun={onRun}
        align="end"
      />
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
      <ToolButton id="fullscreen" state={state} onRun={onRun} />
      <ToolButton id="shortcuts" state={state} onRun={onRun} />
    </div>
  );
}

// ------------------------------------------------------------------ phone

/** Dock buttons change with the selection, so every one is usable. */
const DOCK_IDLE: [ToolId, ToolId, ToolId] = ["search", "outline", "fit"];
const DOCK_TOPIC: [ToolId, ToolId, ToolId] = ["edit", "sibling", "format"];

function DockButton({
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
  const active = isToolActive(id, state);
  return (
    <button
      type="button"
      onClick={() => onRun(id)}
      disabled={isToolDisabled(id, state)}
      aria-label={tool.label}
      aria-pressed={TOGGLE_TOOLS.has(id) ? active : undefined}
      className={cn(
        "flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] font-medium leading-none transition-[transform,background-color,color] duration-200 active:scale-90 disabled:opacity-35 motion-reduce:transform-none",
        active
          ? "flowy-active"
          : "text-foreground/80 [@media(hover:hover)]:hover:bg-accent",
        tool.danger && !active && "text-destructive/90",
      )}
    >
      <Icon className="size-5" />
      <span className="max-w-full truncate px-0.5">
        {tool.short ?? tool.label}
      </span>
    </button>
  );
}

const SHEET_GROUPS: { title: string; tools: ToolId[] }[] = [
  {
    title: "Tópico",
    tools: [
      "parent",
      "duplicate",
      "note",
      "boundary",
      "link",
      "focus",
      "copy-style",
      "paste-style",
      "delete",
    ],
  },
  {
    title: "Mapa",
    tools: [
      "present",
      "floating",
      "auto-arrange",
      ...EXPAND_TOOLS,
      "template",
      "center",
    ],
  },
  { title: "Arquivo", tools: [...FILE_TOOLS, "trash"] },
];

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
  const active = isToolActive(id, state);
  return (
    <button
      type="button"
      disabled={isToolDisabled(id, state)}
      onClick={() => onRun(id)}
      aria-pressed={TOGGLE_TOOLS.has(id) ? active : undefined}
      className={cn(
        "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-muted/40 px-1 py-2 text-[11px] font-medium text-foreground/80 transition-[transform,background-color] active:scale-95 disabled:opacity-35 motion-reduce:transform-none",
        active && "flowy-active",
        tool.danger && "text-destructive",
      )}
    >
      <Icon className="size-5" />
      <span className="line-clamp-2 w-full text-center leading-tight">
        {tool.short ?? tool.label}
      </span>
    </button>
  );
}

interface MobileToolbarProps extends ToolbarProps {
  sheetOpen: boolean;
  onToggleSheet: () => void;
}

const SHEET_TITLE =
  "mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";

/** Lifted off the bottom edge so it clears the home indicator and thumbs. */
const DOCK_BOTTOM =
  "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+0.75rem)]";

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
  const dock = state.hasTopic ? DOCK_TOPIC : DOCK_IDLE;
  const add: ToolId = "child";
  return (
    <>
      <div className="flowy-glass absolute right-3 top-3 z-30 flex items-center gap-0.5 rounded-2xl border p-1 md:hidden">
        <ToolButton id="undo" state={state} onRun={onRun} />
        <ToolButton id="redo" state={state} onRun={onRun} />
      </div>

      {sheetOpen ? (
        <div
          className={cn(
            "flowy-glass flowy-glass-strong absolute inset-x-3 z-30 mx-auto max-h-[58%] max-w-md animate-in fade-in slide-in-from-bottom-3 overflow-y-auto overscroll-contain rounded-3xl border p-3 md:hidden",
            "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+6rem)]",
          )}
          role="dialog"
          aria-label="Mais ferramentas"
        >
          <p className={SHEET_TITLE}>Layout</p>
          <div className="mb-4 grid grid-cols-3 gap-1.5">
            {layoutOptionsFor(layout).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={layout === option.id}
                onClick={() => onLayout(option.id)}
                className={cn(
                  "flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-2xl bg-muted/40 px-1 text-[11px] font-medium text-foreground/80",
                  layout === option.id && "flowy-active",
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
            <div key={group.title} className="mb-4">
              <p className={SHEET_TITLE}>{group.title}</p>
              {group.title === "Tópico" && !state.hasTopic ? (
                <p className="rounded-2xl bg-primary/10 px-3 py-2.5 text-xs font-medium flowy-ink">
                  Toque em um tópico do mapa para ver as ações dele.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {group.tools.map((id) => (
                    <SheetButton key={id} id={id} state={state} onRun={onRun} />
                  ))}
                </div>
              )}
            </div>
          ))}
          <p className={SHEET_TITLE}>Tema</p>
          <ThemeList value={theme} onChange={onTheme} />
        </div>
      ) : null}

      <nav
        aria-label="Ferramentas do mapa"
        className={cn(
          "flowy-glass flowy-glass-strong absolute inset-x-3 z-30 mx-auto grid max-w-md grid-cols-5 items-center gap-1 rounded-[1.75rem] border p-1.5 md:hidden",
          DOCK_BOTTOM,
        )}
      >
        <DockButton id={dock[0]} state={state} onRun={onRun} />
        <DockButton id={dock[1]} state={state} onRun={onRun} />
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onRun(add)}
            aria-label={state.hasTopic ? TOOLS.child.label : "Adicionar tópico"}
            className="flowy-glow -mt-7 grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-primary-foreground shadow-[0_12px_30px_-8px_hsl(var(--primary)/0.7)] transition-transform active:scale-90 motion-reduce:transform-none"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </button>
        </div>
        <DockButton id={dock[2]} state={state} onRun={onRun} />
        <button
          type="button"
          onClick={onToggleSheet}
          aria-expanded={sheetOpen}
          aria-pressed={sheetOpen}
          aria-label={sheetOpen ? "Fechar ferramentas" : "Mais ferramentas"}
          className={cn(
            "flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10.5px] font-medium leading-none transition-[transform,background-color] active:scale-90 motion-reduce:transform-none",
            sheetOpen
              ? "flowy-active"
              : "text-foreground/80 [@media(hover:hover)]:hover:bg-accent",
          )}
        >
          {sheetOpen ? (
            <X className="size-5" />
          ) : (
            <LayoutGrid className="size-5" />
          )}
          <span>{sheetOpen ? "Fechar" : "Mais"}</span>
        </button>
      </nav>
    </>
  );
}
