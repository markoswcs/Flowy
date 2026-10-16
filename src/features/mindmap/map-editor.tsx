"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { parseMapData, TEMPLATES } from "@/features/mindmap/convert";
import { createMap } from "@/features/mindmap/model";
import type { MapDoc, TemplateId } from "@/features/mindmap/types";
import { TEMPLATE_PARAM } from "@/features/mindmap/components/constants";
import { MapWorkspace } from "@/features/mindmap/components/map-workspace";
import {
  UNTITLED_MAP,
  useMapDocument,
  type SaveStatus,
} from "@/features/mindmap/components/use-map-document";
import { useTrashNote } from "@/features/notes/use-notes";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/content";

const BACK_URL = "/app/notes?tipo=fluxo";

function isTemplateId(value: string | null): value is TemplateId {
  return TEMPLATES.some((template) => template.id === value);
}

function rootTextFor(title: string): string {
  const trimmed = title.trim();
  return !trimmed || /sem título/i.test(trimmed) ? "Ideia central" : trimmed;
}

/** New notes may arrive with `?modelo=<template>`; existing data always wins. */
function loadInitialDoc(
  note: Note,
  template: string | null,
): { doc: MapDoc; fromTemplate: boolean } {
  if (!note.mindmap_data && isTemplateId(template)) {
    return {
      doc: createMap(rootTextFor(note.title), template),
      fromTemplate: true,
    };
  }
  return {
    doc: parseMapData(note.mindmap_data, rootTextFor(note.title)),
    fromTemplate: false,
  };
}

const STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "Salvo",
  saving: "Salvando…",
  offline: "Offline",
  error: "Erro",
};

export default function MapEditor({ note }: { note: Note }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const trash = useTrashNote();
  const [initial] = useState(() =>
    loadInitialDoc(note, searchParams.get(TEMPLATE_PARAM)),
  );
  const map = useMapDocument(note.id, note.title, initial.doc);
  const { saveNow } = map;

  useEffect(() => {
    document.body.classList.add("is-flow-editor");
    return () => document.body.classList.remove("is-flow-editor");
  }, []);

  // A template picked at creation is saved right away and dropped from the URL.
  useEffect(() => {
    if (!initial.fromTemplate) return;
    const timer = window.setTimeout(() => {
      void saveNow();
      router.replace(pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initial.fromTemplate, saveNow, router, pathname]);

  async function handleTrash() {
    try {
      await trash.mutateAsync(note.id);
      router.push(BACK_URL);
    } catch {
      toast.error("Não foi possível excluir o mapa.");
    }
  }

  const status: SaveStatus = online ? map.status : "offline";

  return (
    <div className="flowy-flow-editor flex h-full min-h-0 w-full flex-col">
      <header className="flowy-flow-editor-header grid grid-cols-[2.75rem_minmax(0,1fr)_auto_2.75rem] items-center gap-1 px-2 py-2 sm:px-4">
        <button
          type="button"
          onClick={() => router.push(BACK_URL)}
          className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Voltar para diagramas"
        >
          <ArrowLeft className="size-4" />
        </button>
        <input
          value={map.title}
          onChange={(event) => map.setTitle(event.target.value)}
          placeholder={UNTITLED_MAP}
          className="w-full min-w-0 bg-transparent px-2 py-2 text-base font-semibold outline-none placeholder:text-muted-foreground sm:text-lg"
          aria-label="Título do mapa"
        />
        <span
          className={cn(
            "flex items-center gap-1.5 px-2 text-xs text-muted-foreground",
            status === "error" && "text-destructive",
          )}
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 rounded-full bg-emerald-500",
              status === "saving" && "animate-pulse bg-amber-400",
              status === "offline" && "bg-muted-foreground",
              status === "error" && "bg-destructive",
            )}
          />
          {STATUS_LABEL[status]}
        </span>
        <button
          type="button"
          onClick={() => void handleTrash()}
          disabled={trash.isPending}
          className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          aria-label="Mover mapa para a lixeira"
          title="Mover para a lixeira"
        >
          <Trash2 className="size-4" />
        </button>
      </header>
      <div className="relative min-h-0 flex-1">
        <MapWorkspace
          doc={map.doc}
          title={map.title || UNTITLED_MAP}
          canUndo={map.canUndo}
          canRedo={map.canRedo}
          commit={map.commit}
          undo={map.undo}
          redo={map.redo}
          onTrash={() => void handleTrash()}
        />
      </div>
    </div>
  );
}
