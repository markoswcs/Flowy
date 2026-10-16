"use client";

import MindElixir from "mind-elixir";
import type { MindElixirData, MindElixirInstance, NodeObj } from "mind-elixir";
import { pt } from "mind-elixir/i18n";
import "mind-elixir/style.css";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronsDownUp,
  Crosshair,
  Download,
  LayoutGrid,
  GitBranchPlus,
  GitFork,
  ListPlus,
  Maximize2,
  Network,
  Palette,
  PencilLine,
  Redo2,
  Spline,
  SquareDashedBottom,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "@/lib/toast";

import { useSaveNote, useTrashNote } from "@/features/notes/use-notes";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { ORGANIZER_COLORS } from "@/lib/color-palette";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/content";

type SaveStatus = "saved" | "saving" | "offline" | "error";

const SAVE_DELAY = 800;
const ZOOM_STEP = 0.2;

const LAYOUTS = [
  { label: "Dos dois lados", apply: (mind: MindElixirInstance) => mind.initSide() },
  { label: "Para a direita", apply: (mind: MindElixirInstance) => mind.initRight() },
  { label: "Para a esquerda", apply: (mind: MindElixirInstance) => mind.initLeft() },
] as const;

function starterMap(title: string): MindElixirData {
  const data = MindElixir.new(title.trim() || "Ideia central");
  // Phones are narrow: grow new maps to the right instead of to both sides.
  if (window.innerWidth < 640) data.direction = MindElixir.RIGHT;
  data.nodeData.children = ["Objetivos", "Tarefas", "Referências"].map(
    (topic, index) => ({ id: `starter-${index}`, topic }),
  );
  return data;
}

function parseMap(raw: string | null, title: string): MindElixirData {
  if (!raw) return starterMap(title);
  try {
    const data = JSON.parse(raw) as MindElixirData;
    return data?.nodeData ? data : starterMap(title);
  } catch {
    return starterMap(title);
  }
}

function collectTopics(node: NodeObj, topics: string[] = []): string[] {
  topics.push(node.topic);
  node.children?.forEach((child) => collectTopics(child, topics));
  return topics;
}

function flowyTheme(dark: boolean) {
  const base = dark ? MindElixir.DARK_THEME : MindElixir.THEME;
  return {
    ...base,
    cssVar: {
      ...base.cssVar,
      "--bgcolor": "transparent",
      "--root-bgcolor": "hsl(var(--primary))",
      "--root-color": "hsl(var(--primary-foreground))",
      "--root-border-color": "transparent",
      "--main-bgcolor": "hsl(var(--muted))",
      "--main-color": "hsl(var(--foreground))",
      "--main-border": "1px solid hsl(var(--border))",
      "--color": "hsl(var(--foreground))",
      "--selected": "hsl(var(--primary))",
      "--accent-color": "hsl(var(--primary))",
      "--main-radius": "14px",
      "--root-radius": "18px",
      "--topic-padding": "6px 12px",
      "--main-gap-x": "56px",
      "--main-gap-y": "18px",
      "--panel-bgcolor": "hsl(var(--card))",
      "--panel-color": "hsl(var(--foreground))",
      "--panel-border-color": "hsl(var(--border))",
    },
  };
}

// Centers the whole drawing (not just the root topic) inside the canvas.
function centerContent(mind: MindElixirInstance, container: HTMLElement) {
  const topics = container.querySelectorAll<HTMLElement>("me-tpc");
  if (!topics.length) return;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  topics.forEach((topic) => {
    const rect = topic.getBoundingClientRect();
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  });
  const box = container.getBoundingClientRect();
  mind.move(
    box.left + box.width / 2 - (left + right) / 2,
    box.top + box.height / 2 - (top + bottom) / 2,
  );
}

function isDarkTheme() {
  return !document.documentElement.classList.contains("white");
}

interface Tool {
  id: string;
  label: string;
  /** Shorter name for the phone sheet, where space is tight. */
  short?: string;
  icon: ReactNode;
  needsNode?: boolean;
  active?: boolean;
  danger?: boolean;
}

interface ToolGroup {
  title: string;
  tools: Tool[];
}

function DockButton({
  tool,
  disabled,
  onRun,
}: {
  tool: Tool;
  disabled?: boolean;
  onRun: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRun(tool.id)}
      disabled={disabled}
      aria-label={tool.label}
      aria-pressed={tool.active}
      data-tip={tool.label}
      className={cn(
        "flowy-dock-button grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-45",
        tool.active && "bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]",
        tool.danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {tool.icon}
    </button>
  );
}

function SheetButton({
  tool,
  disabled,
  onRun,
}: {
  tool: Tool;
  disabled?: boolean;
  onRun: (id: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onRun(tool.id);
      }}
      aria-pressed={tool.active}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-all active:scale-95 disabled:opacity-45",
        tool.active ? "bg-primary/15 text-primary" : "bg-muted/40 hover:bg-accent hover:text-foreground",
        tool.danger && "text-destructive",
      )}
    >
      <span className="grid size-8 place-items-center">{tool.icon}</span>
      <span className="w-full truncate px-0.5 leading-tight">{tool.short ?? tool.label}</span>
    </button>
  );
}

export default function MindmapNoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const online = useOnlineStatus();
  const { mutateAsync: saveNote } = useSaveNote(note.id);
  const trash = useTrashNote();
  const containerRef = useRef<HTMLDivElement>(null);
  const mindRef = useRef<MindElixirInstance | null>(null);
  const saveTimer = useRef<number | null>(null);
  const linkFrom = useRef<string | null>(null);
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [linking, setLinking] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<number | null>(null);
  const layoutIndex = useRef(0);
  const titleRef = useRef(title);

  useEffect(() => {
    document.body.classList.add("is-flow-editor");
    return () => document.body.classList.remove("is-flow-editor");
  }, []);

  const persist = useCallback(async () => {
    const mind = mindRef.current;
    if (!mind) return;
    const data = mind.getData();
    setStatus("saving");
    try {
      await saveNote({
        title: titleRef.current.trim() || "Mapa mental sem título",
        mindmap_data: JSON.stringify(data),
        plain_text: collectTopics(data.nodeData).join(" · ").slice(0, 20000),
      });
      setStatus("saved");
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
    }
  }, [saveNote]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setStatus("saving");
    saveTimer.current = window.setTimeout(() => void persist(), SAVE_DELAY);
  }, [persist]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mind = new MindElixir({
      el,
      direction: MindElixir.SIDE,
      toolBar: false,
      keypress: true,
      contextMenu: { locale: pt, focus: true, link: true },
      newTopicName: "Novo tópico",
      allowUndo: true,
      theme: flowyTheme(isDarkTheme()),
    });
    const initialData = parseMap(note.mindmap_data, note.title);
    mind.init(initialData);
    mindRef.current = mind;
    layoutIndex.current =
      initialData.direction === MindElixir.RIGHT
        ? 1
        : initialData.direction === MindElixir.LEFT
          ? 2
          : 0;
    const fitFrame = window.requestAnimationFrame(() => {
      mind.scaleFit();
      if (mind.scaleVal > 1) mind.scale(1);
      else if (window.innerWidth < 640 && mind.scaleVal < 0.85) {
        mind.scale(0.85);
        centerContent(mind, el);
      }
    });

    mind.bus.addListener("operation", (operation) => {
      if (operation.name === "beginEdit") return;
      scheduleSave();
    });

    mind.bus.addListener("scale", (value) => setZoomLevel(Math.round(value * 100)));
    mind.bus.addListener("unselectNodes", () => {
      window.setTimeout(() => setHasSelection(Boolean(mind.currentNode)), 0);
    });

    // "Ligar tópicos": first selected topic is the origin, the next one the target.
    mind.bus.addListener("selectNodes", (nodes) => {
      setHasSelection(nodes.length > 0);
      const from = linkFrom.current;
      const target = nodes[0];
      if (!from || !target || target.id === from) return;
      linkFrom.current = null;
      setLinking(false);
      // Options are spread into the arrow, so this replaces the English
      // "Custom Link" default label; double-tapping the arrow edits it.
      mind.createArrow(mind.findEle(from), mind.findEle(target.id), {
        label: "",
      } as Parameters<MindElixirInstance["createArrow"]>[2]);
      scheduleSave();
    });

    const observer = new MutationObserver(() => {
      mind.changeTheme(flowyTheme(isDarkTheme()));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.cancelAnimationFrame(fitFrame);
      observer.disconnect();
      mind.destroy();
      mindRef.current = null;
    };
    // The map is created once per note; later changes flow through Mind Elixir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  useEffect(
    () => () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        void persist();
      }
    },
    [persist],
  );

  // Short tips appear inside the canvas instead of as notifications.
  function showHint(message: string) {
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    setHint(message);
    hintTimer.current = window.setTimeout(() => setHint(null), 2600);
  }

  function withSelection(action: (mind: MindElixirInstance) => void) {
    const mind = mindRef.current;
    if (!mind) return;
    if (!mind.currentNode) {
      showHint("Toque em um tópico primeiro.");
      return;
    }
    action(mind);
  }

  function setNodeColor(color: string | null) {
    setPaletteOpen(false);
    withSelection((mind) => {
      // Mind Elixir merges styles, so empty values are what clear a color.
      void mind.reshapeNode(mind.currentNode!, {
        style: color
          ? { background: color, color: "#0b0b0f" }
          : { background: "", color: "" },
      });
    });
  }

  function toggleCollapse() {
    withSelection((mind) => {
      const node = mind.currentNode!;
      if (!node.nodeObj.children?.length) {
        showHint("Esse tópico não tem filhos para recolher.");
        return;
      }
      mind.expandNode(node, node.nodeObj.expanded === false);
      scheduleSave();
    });
  }

  function toggleFocus() {
    const mind = mindRef.current;
    if (!mind) return;
    if (focused) {
      mind.cancelFocus();
      setFocused(false);
      return;
    }
    withSelection((current) => {
      current.focusNode(current.currentNode!);
      setFocused(true);
    });
  }

  function cycleLayout() {
    const mind = mindRef.current;
    if (!mind) return;
    layoutIndex.current = (layoutIndex.current + 1) % LAYOUTS.length;
    const layout = LAYOUTS[layoutIndex.current] ?? LAYOUTS[0];
    layout.apply(mind);
    showHint(`Layout: ${layout.label.toLowerCase()}`);
    scheduleSave();
  }

  function zoom(delta: number) {
    const mind = mindRef.current;
    if (!mind) return;
    mind.scale(Math.min(3, Math.max(0.2, mind.scaleVal + delta)));
  }

  function startLinking() {
    if (linking) {
      linkFrom.current = null;
      setLinking(false);
      return;
    }
    withSelection((mind) => {
      linkFrom.current = mind.currentNode!.nodeObj.id;
      setLinking(true);
      showHint("Agora toque no tópico que você quer ligar.");
    });
  }

  function exportImage() {
    const mind = mindRef.current;
    if (!mind) return;
    const blob = mind.exportSvg();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.trim() || "mapa-mental"}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleTrash() {
    try {
      await trash.mutateAsync(note.id);
      router.push("/app/notes?tipo=fluxo");
    } catch {
      toast.error("Não foi possível excluir o mapa mental.");
    }
  }

  const iconClass = "size-[18px]";
  const historyTools: Tool[] = [
    { id: "undo", label: "Desfazer", icon: <Undo2 className={iconClass} /> },
    { id: "redo", label: "Refazer", icon: <Redo2 className={iconClass} /> },
  ];
  const addTools: Tool[] = [
    { id: "child",
      label: "Filho",
      icon: <GitBranchPlus className={iconClass} />,
      needsNode: true },
    { id: "sibling",
      label: "Irmão",
      icon: <ListPlus className={iconClass} />,
      needsNode: true },
    { id: "parent",
      label: "Pai",
      icon: <GitFork className={iconClass} />,
      needsNode: true },
  ];
  const editTools: Tool[] = [
    { id: "edit",
      label: "Editar texto",
      short: "Editar",
      icon: <PencilLine className={iconClass} />,
      needsNode: true },
    { id: "color",
      label: "Cor",
      icon: <Palette className={iconClass} />,
      needsNode: true,
      active: paletteOpen },
    { id: "up",
      label: "Mover para cima",
      short: "Subir",
      icon: <ArrowUp className={iconClass} />,
      needsNode: true },
    { id: "down",
      label: "Mover para baixo",
      short: "Descer",
      icon: <ArrowDown className={iconClass} />,
      needsNode: true },
    { id: "collapse",
      label: "Recolher/expandir",
      short: "Recolher",
      icon: <ChevronsDownUp className={iconClass} />,
      needsNode: true },
    { id: "delete",
      label: "Excluir tópico",
      short: "Excluir",
      icon: <Trash2 className={iconClass} />,
      needsNode: true,
      danger: true },
  ];
  const connectTools: Tool[] = [
    { id: "link",
      label: "Ligar tópicos",
      short: "Ligar",
      icon: <Spline className={iconClass} />,
      active: linking },
    { id: "summary",
      label: "Resumo",
      icon: <SquareDashedBottom className={iconClass} />,
      needsNode: true },
  ];
  const viewTools: Tool[] = [
    { id: "focus",
      label: focused ? "Sair do foco" : "Focar tópico",
      short: focused ? "Sair foco" : "Focar",
      icon: <Crosshair className={iconClass} />,
      active: focused },
    { id: "layout", label: "Trocar layout",
      short: "Layout", icon: <Network className={iconClass} /> },
    { id: "fit", label: "Centralizar", icon: <Maximize2 className={iconClass} /> },
    { id: "zoom-out", label: "Diminuir zoom",
      short: "Zoom −", icon: <ZoomOut className={iconClass} /> },
    { id: "zoom-in", label: "Aumentar zoom",
      short: "Zoom +", icon: <ZoomIn className={iconClass} /> },
  ];
  function runTool(id: string) {
    switch (id) {
      case "undo":
        mindRef.current?.undo();
        return;
      case "redo":
        mindRef.current?.redo();
        return;
      case "child":
        withSelection((mind) => void mind.addChild());
        return;
      case "sibling":
        withSelection((mind) => void mind.insertSibling("after"));
        return;
      case "parent":
        withSelection((mind) => {
          if (mind.currentNode?.nodeObj.parent === undefined) {
            showHint("O tópico central não pode ganhar um pai.");
            return;
          }
          void mind.insertParent();
        });
        return;
      case "edit":
        withSelection((mind) => void mind.beginEdit());
        return;
      case "color":
        withSelection(() => {
          setMoreOpen(false);
          setPaletteOpen((open) => !open);
        });
        return;
      case "up":
        withSelection((mind) => void mind.moveUpNode());
        return;
      case "down":
        withSelection((mind) => void mind.moveDownNode());
        return;
      case "collapse":
        toggleCollapse();
        return;
      case "delete":
        withSelection((mind) => {
          if (mind.currentNode?.nodeObj.parent === undefined) {
            showHint("O tópico central não pode ser excluído.");
            return;
          }
          void mind.removeNodes(mind.currentNodes);
        });
        return;
      case "link":
        startLinking();
        return;
      case "summary":
        withSelection((mind) => mind.createSummary());
        return;
      case "focus":
        toggleFocus();
        return;
      case "layout":
        cycleLayout();
        return;
      case "fit":
        mindRef.current?.scaleFit();
        return;
      case "zoom-out":
        zoom(-ZOOM_STEP);
        return;
      case "zoom-in":
        zoom(ZOOM_STEP);
        return;
      case "export":
        exportImage();
        return;
      case "trash":
        void handleTrash();
        return;
    }
  }

  const toolGroups: ToolGroup[] = [
    { title: "Histórico", tools: historyTools },
    { title: "Adicionar", tools: addTools },
    { title: "Editar", tools: editTools },
    { title: "Conectar", tools: connectTools },
    { title: "Visualizar", tools: viewTools },
  ];
  const sheetGroups: ToolGroup[] = [
    ...toolGroups,
    {
      title: "Arquivo",
      tools: [
        { id: "export", label: "Exportar imagem", short: "Exportar", icon: <Download className={iconClass} /> },
        { id: "trash", label: "Mover para a lixeira", short: "Lixeira", icon: <Trash2 className={iconClass} />, danger: true },
      ],
    },
  ];
  const mobileTools = [...historyTools, ...addTools.slice(0, 2), ...editTools.slice(0, 1)];

  const statusLabel = !online
    ? "Sem conexão"
    : status === "saving"
      ? "Salvando…"
      : status === "error"
        ? "Erro ao salvar"
        : status === "offline"
          ? "Sem conexão"
          : "Salvo";

  return (
    <div className="flowy-flow-editor flex h-full min-h-0 w-full flex-col">
      <header className="flowy-flow-editor-header grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-1 px-2 py-2 sm:mx-auto sm:w-full sm:max-w-[1800px] sm:grid-cols-[2.75rem_minmax(0,1fr)_auto_2.75rem_2.75rem] sm:px-6 sm:py-3">
        <button
          type="button"
          onClick={() => router.push("/app/notes?tipo=fluxo")}
          className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Voltar para diagramas"
        >
          <ArrowLeft className="size-4" />
        </button>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            titleRef.current = event.target.value;
            scheduleSave();
          }}
          placeholder="Mapa mental sem título"
          className="w-full min-w-0 bg-transparent px-2 py-2 text-base font-semibold outline-none placeholder:text-muted-foreground sm:text-lg"
          aria-label="Título do mapa mental"
        />
        <span className="px-2 text-xs text-muted-foreground" aria-live="polite">
          {statusLabel}
        </span>
        <button
          type="button"
          onClick={exportImage}
          className="hidden size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground sm:grid"
          aria-label="Exportar como imagem SVG"
          title="Exportar como imagem SVG"
        >
          <Download className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void handleTrash()}
          className="hidden size-11 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:grid"
          aria-label="Mover mapa mental para a lixeira"
          title="Mover para a lixeira"
        >
          <Trash2 className="size-4" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1 bg-card sm:mx-auto sm:mb-4 sm:w-[calc(100%-3rem)] sm:max-w-[1800px] sm:overflow-hidden sm:rounded-2xl">
        <div
          ref={containerRef}
          className="flowy-mindmap h-full w-full"
          role="region"
          aria-label="Área de edição do mapa mental"
        />

        {linking ? (
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-2 text-xs font-medium shadow-lg">
            <Spline className="size-4 text-primary" aria-hidden="true" />
            Toque no tópico de destino
            <button
              type="button"
              onClick={startLinking}
              className="grid size-6 place-items-center rounded-full hover:bg-accent"
              aria-label="Cancelar ligação"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}

        {hint && !linking ? (
          <div
            role="status"
            className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 animate-in fade-in slide-in-from-top-2 whitespace-nowrap rounded-full border border-border/70 bg-card/95 px-4 py-2 text-xs font-medium shadow-lg backdrop-blur"
          >
            {hint}
          </div>
        ) : null}

        {paletteOpen ? (
          <div
            className="absolute inset-x-3 bottom-[5.5rem] z-20 mx-auto flex max-w-sm flex-wrap justify-center gap-2 rounded-3xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 sm:bottom-28"
            role="group"
            aria-label="Cor do tópico"
          >
            {ORGANIZER_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setNodeColor(color.value)}
                className="size-8 rounded-full ring-1 ring-border/60 transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: color.value }}
                aria-label={`Cor ${color.name}`}
                title={color.name}
              />
            ))}
            <button
              type="button"
              onClick={() => setNodeColor(null)}
              className="grid size-8 place-items-center rounded-full text-muted-foreground ring-1 ring-border/60 hover:text-foreground"
              aria-label="Remover cor"
              title="Sem cor"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        {moreOpen ? (
          <div
            className="absolute inset-x-3 bottom-[5.5rem] z-20 max-h-[60%] overflow-y-auto rounded-3xl border border-border/70 bg-card/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 sm:hidden"
            aria-label="Mais ferramentas"
          >
            {!hasSelection ? (
              <p className="mb-3 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                Toque em um tópico do mapa para liberar as ferramentas de edição.
              </p>
            ) : null}
            {sheetGroups.map((group) => (
              <div key={group.title} className="mb-3 last:mb-0">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.title}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {group.tools.map((tool) => (
                    <SheetButton
                      key={tool.id}
                      tool={tool}
                      disabled={tool.needsNode && !hasSelection}
                      onRun={(id) => {
                        runTool(id);
                        setMoreOpen(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <nav
          aria-label="Ferramentas do mapa mental"
          className="safe-bottom absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-1 rounded-[1.4rem] border border-border/70 bg-card/90 p-1.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.45)] backdrop-blur-xl sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:max-w-[calc(100%-3rem)] sm:-translate-x-1/2 sm:justify-start sm:gap-0"
        >
          {/* Phones: the essentials plus a "more" sheet with every tool. */}
          <div className="flex items-center gap-0.5 sm:hidden">
            {mobileTools.map((tool) => (
              <DockButton
                key={tool.id}
                tool={tool}
                disabled={tool.needsNode && !hasSelection}
                onRun={runTool}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setPaletteOpen(false);
              setMoreOpen((open) => !open);
            }}
            aria-expanded={moreOpen}
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-all active:scale-95 sm:hidden",
              moreOpen ? "bg-primary/25 text-primary ring-1 ring-primary/40" : "bg-primary/15 text-primary",
            )}
          >
            {moreOpen ? <X className="size-4" /> : <LayoutGrid className="size-4" />}
            Mais
          </button>

          {/* Desktop: every tool, grouped, with labels on hover. */}
          <div className="hidden items-center sm:flex">
            {toolGroups.map((group, index) => (
              <div
                key={group.title}
                role="group"
                aria-label={group.title}
                className={cn(
                  "flex items-center gap-0.5 px-1.5",
                  index > 0 && "border-l border-border/60",
                )}
              >
                {group.tools.map((tool) => (
                  <DockButton
                    key={tool.id}
                    tool={tool}
                    disabled={tool.needsNode && !hasSelection}
                    onRun={runTool}
                  />
                ))}
                {group.title === "Visualizar" ? (
                  <span className="min-w-12 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                    {zoomLevel}%
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
