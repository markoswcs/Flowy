"use client";

import MindElixir from "mind-elixir";
import type { MindElixirData, MindElixirInstance, NodeObj } from "mind-elixir";
import { pt } from "mind-elixir/i18n";
import "mind-elixir/style.css";
import {
  ArrowLeft,
  Download,
  GitBranchPlus,
  ListPlus,
  Maximize2,
  Redo2,
  Spline,
  SquareDashedBottom,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useSaveNote, useTrashNote } from "@/features/notes/use-notes";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/content";

type SaveStatus = "saved" | "saving" | "offline" | "error";

const SAVE_DELAY = 800;

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
    mind.init(parseMap(note.mindmap_data, note.title));
    mindRef.current = mind;
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

        <nav
          aria-label="Ferramentas do mapa mental"
          className="safe-bottom absolute inset-x-2 bottom-2 flex items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card/95 p-1.5 shadow-xl backdrop-blur [scrollbar-width:none] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
        >
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
          <ToolButton label="Ligar" onClick={startLinking} active={linking}>
            <Spline className="size-4" />
          </ToolButton>
          <ToolButton
            label="Resumo"
            onClick={() => withSelection((mind) => mind.createSummary())}
          >
            <SquareDashedBottom className="size-4" />
          </ToolButton>
          <ToolButton
            label="Centralizar"
            onClick={() => mindRef.current?.scaleFit()}
          >
            <Maximize2 className="size-4" />
          </ToolButton>
          <ToolButton label="Desfazer" onClick={() => mindRef.current?.undo()}>
            <Undo2 className="size-4" />
          </ToolButton>
          <ToolButton label="Refazer" onClick={() => mindRef.current?.redo()}>
            <Redo2 className="size-4" />
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
        </nav>
      </div>
    </div>
  );
}
