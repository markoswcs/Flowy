"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { MapDoc, Topic } from "@/features/mindmap/types";
import { topicsInOrder } from "@/features/mindmap/interop/formats";

function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function haystack(topic: Topic): string {
  return normalize(
    [topic.text, topic.note ?? "", ...(topic.labels ?? [])].join(" "),
  );
}

/** Ids of topics whose text, note or labels contain `query` (accent-insensitive). */
export function searchTopics(doc: MapDoc, query: string): string[] {
  const needle = normalize(query.trim());
  if (!needle) return [];
  return topicsInOrder(doc)
    .filter((topic) => haystack(topic).includes(needle))
    .map((topic) => topic.id);
}

interface SearchBarProps {
  query: string;
  index: number;
  count: number;
  onQuery: (query: string) => void;
  onStep: (delta: 1 | -1) => void;
  onClose: () => void;
}

export function SearchBar({
  query,
  index,
  count,
  onQuery,
  onStep,
  onClose,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);
  return (
    <div
      role="search"
      className="flowy-glass flowy-glass-strong absolute left-1/2 top-3 z-30 flex w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 animate-in fade-in slide-in-from-top-2 items-center gap-1 rounded-2xl border p-1.5 md:top-[4.5rem]"
    >
      <Search className="ml-2 size-4 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onStep(event.shiftKey ? -1 : 1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        placeholder="Buscar tópicos, notas e etiquetas"
        aria-label="Buscar no mapa"
        className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      <span
        className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground"
        aria-live="polite"
      >
        {query.trim() ? (count ? `${index + 1}/${count}` : "0") : ""}
      </span>
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={!count}
        aria-label="Resultado anterior"
        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-accent disabled:opacity-40"
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={!count}
        aria-label="Próximo resultado"
        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-accent disabled:opacity-40"
      >
        <ChevronDown className="size-4" />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar busca"
        className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-accent"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
