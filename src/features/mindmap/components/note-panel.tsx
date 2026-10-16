"use client";

import { StickyNote, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { Topic } from "@/features/mindmap/types";

interface NotePanelProps {
  topic: Topic;
  onSave: (note: string | undefined) => void;
  onClose: () => void;
}

/** Remount with key={topic.id} so the draft resets per topic. */
export function NotePanel({ topic, onSave, onClose }: NotePanelProps) {
  const [draft, setDraft] = useState(topic.note ?? "");
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const saved = useRef(topic.note ?? "");

  useEffect(() => {
    fieldRef.current?.focus({ preventScroll: true });
  }, []);

  function save() {
    const next = draft.replace(/\s+$/, "");
    if (next === saved.current) return;
    saved.current = next;
    onSave(next || undefined);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 px-4 pb-2 pt-3">
        <StickyNote className="size-4 text-primary" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
          Nota · {topic.text || "Tópico"}
        </h2>
        <button
          type="button"
          onClick={() => {
            save();
            onClose();
          }}
          aria-label="Fechar nota"
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 px-4 pb-4">
        <textarea
          ref={fieldRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              save();
              onClose();
            }
          }}
          placeholder="Escreva detalhes, contexto ou próximos passos…"
          aria-label="Nota do tópico"
          className="h-full min-h-40 w-full resize-none rounded-2xl border border-border bg-background/60 p-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/25"
        />
      </div>
    </div>
  );
}
