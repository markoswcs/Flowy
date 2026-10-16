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
import { toast } from "sonner";

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
    },
  };
}

function isDarkTheme() {
  return !document.documentElement.classList.contains("white");
}

function ToolButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95 sm:min-w-0 sm:flex-row sm:gap-2 sm:px-3 sm:text-xs",
        active && "bg-primary/15 text-primary",
      )}
    >
      {children}
      <span className="whitespace-nowrap">{label}</span>
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
    });

    mind.bus.addListener("operation", (operation) => {
      if (operation.name === "beginEdit") return;
      scheduleSave();
    });

    // "Ligar tópicos": first selected topic is the origin, the next one the target.
    mind.bus.addListener("selectNodes", (nodes) => {
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

  function withSelection(action: (mind: MindElixirInstance) => void) {
    const mind = mindRef.current;
    if (!mind) return;
    if (!mind.currentNode) {
      toast("Toque em um tópico primeiro.");
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
        toast("Esse tópico não tem filhos para recolher.");
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
    toast(`Layout: ${layout.label.toLowerCase()}`);
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
      toast("Agora toque no tópico que você quer ligar.");
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

        {paletteOpen ? (
          <div
            className="absolute inset-x-2 bottom-24 z-10 mx-auto flex max-w-sm flex-wrap justify-center gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-xl sm:bottom-28"
            role="group"
            aria-label="Cor do tópico"
          >
            {ORGANIZER_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setNodeColor(color.value)}
                className="size-8 rounded-full border border-border/60 transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: color.value }}
                aria-label={`Cor ${color.name}`}
                title={color.name}
              />
            ))}
            <button
              type="button"
              onClick={() => setNodeColor(null)}
              className="grid size-8 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground"
              aria-label="Remover cor"
              title="Sem cor"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <nav
          aria-label="Ferramentas do mapa mental"
          className="safe-bottom absolute inset-x-2 bottom-2 flex items-center rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-xl backdrop-blur sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:max-w-[calc(100%-3rem)] sm:-translate-x-1/2"
        >
          {/* Undo/redo stay pinned so they never scroll out of view on phones. */}
          <div className="flex shrink-0 items-center gap-1 border-r border-border/70 pr-1">
            <ToolButton label="Desfazer" onClick={() => mindRef.current?.undo()}>
              <Undo2 className="size-4" />
            </ToolButton>
            <ToolButton label="Refazer" onClick={() => mindRef.current?.redo()}>
              <Redo2 className="size-4" />
            </ToolButton>
          </div>
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto pl-1 [scrollbar-width:none]">
            <ToolButton
              label="Filho"
              onClick={() => withSelection((mind) => void mind.addChild())}
            >
              <GitBranchPlus className="size-4" />
            </ToolButton>
            <ToolButton
              label="Irmão"
              onClick={() =>
                withSelection((mind) => void mind.insertSibling("after"))
              }
            >
              <ListPlus className="size-4" />
            </ToolButton>
            <ToolButton
              label="Pai"
              onClick={() =>
                withSelection((mind) => {
                  if (mind.currentNode?.nodeObj.parent === undefined) {
                    toast("O tópico central não pode ganhar um pai.");
                    return;
                  }
                  void mind.insertParent();
                })
              }
            >
              <GitFork className="size-4" />
            </ToolButton>
            <ToolButton
              label="Editar"
              onClick={() => withSelection((mind) => void mind.beginEdit())}
            >
              <PencilLine className="size-4" />
            </ToolButton>
            <ToolButton
              label="Cor"
              active={paletteOpen}
              onClick={() =>
                withSelection(() => setPaletteOpen((open) => !open))
              }
            >
              <Palette className="size-4" />
            </ToolButton>
            <ToolButton
              label="Subir"
              onClick={() => withSelection((mind) => void mind.moveUpNode())}
            >
              <ArrowUp className="size-4" />
            </ToolButton>
            <ToolButton
              label="Descer"
              onClick={() => withSelection((mind) => void mind.moveDownNode())}
            >
              <ArrowDown className="size-4" />
            </ToolButton>
            <ToolButton label="Recolher" onClick={toggleCollapse}>
              <ChevronsDownUp className="size-4" />
            </ToolButton>
            <ToolButton label="Ligar" onClick={startLinking} active={linking}>
              <Spline className="size-4" />
            </ToolButton>
            <ToolButton
              label="Resumo"
              onClick={() => withSelection((mind) => mind.createSummary())}
            >
              <SquareDashedBottom className="size-4" />
            </ToolButton>
            <ToolButton label="Foco" onClick={toggleFocus} active={focused}>
              <Crosshair className="size-4" />
            </ToolButton>
            <ToolButton label="Layout" onClick={cycleLayout}>
              <Network className="size-4" />
            </ToolButton>
            <ToolButton label="Diminuir" onClick={() => zoom(-ZOOM_STEP)}>
              <ZoomOut className="size-4" />
            </ToolButton>
            <ToolButton label="Aumentar" onClick={() => zoom(ZOOM_STEP)}>
              <ZoomIn className="size-4" />
            </ToolButton>
            <ToolButton
              label="Centralizar"
              onClick={() => mindRef.current?.scaleFit()}
            >
              <Maximize2 className="size-4" />
            </ToolButton>
            <ToolButton
              label="Excluir"
              onClick={() =>
                withSelection((mind) => {
                  if (mind.currentNode?.nodeObj.parent === undefined) {
                    toast("O tópico central não pode ser excluído.");
                    return;
                  }
                  void mind.removeNodes(mind.currentNodes);
                })
              }
            >
              <Trash2 className="size-4" />
            </ToolButton>
            <span className="contents sm:hidden">
              <ToolButton label="Exportar" onClick={exportImage}>
                <Download className="size-4" />
              </ToolButton>
              <ToolButton label="Lixeira" onClick={() => void handleTrash()}>
                <Trash2 className="size-4 text-destructive" />
              </ToolButton>
            </span>
          </div>
        </nav>
      </div>
    </div>
  );
}
