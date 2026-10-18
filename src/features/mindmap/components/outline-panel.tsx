"use client";

import { ChevronRight, X } from "lucide-react";
import { useState } from "react";

import type { MapDoc, Topic } from "@/features/mindmap/types";
import { cn } from "@/lib/utils";

interface OutlinePanelProps {
  doc: MapDoc;
  selection: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onRename: (id: string, text: string) => void;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
  onClose: () => void;
}

function OutlineRow({
  topic,
  depth,
  props,
}: {
  topic: Topic;
  depth: number;
  props: OutlinePanelProps;
}) {
  const [draft, setDraft] = useState(topic.text);
  const [seen, setSeen] = useState(topic.text);
  // Follow edits made on the canvas while this row is not being typed in.
  if (seen !== topic.text) {
    setSeen(topic.text);
    setDraft(topic.text);
  }
  const selected = props.selection.has(topic.id);
  const save = () => {
    if (draft !== topic.text) props.onRename(topic.id, draft);
  };
  return (
    <li
      role="treeitem"
      aria-selected={selected}
      aria-expanded={topic.children.length ? !topic.collapsed : undefined}
    >
      <div
        className={cn(
          "group flex min-h-9 items-center gap-1 rounded-lg pr-1",
          selected && "bg-primary/10",
        )}
        style={{ paddingLeft: depth * 14 }}
      >
        <button
          type="button"
          onClick={() => props.onToggle(topic.id)}
          disabled={!topic.children.length}
          aria-label={topic.collapsed ? "Expandir" : "Recolher"}
          className="grid size-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent disabled:invisible"
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform",
              !topic.collapsed && "rotate-90",
            )}
          />
        </button>
        {topic.icon ? (
          <span className="shrink-0 text-sm" aria-hidden="true">
            {topic.icon}
          </span>
        ) : null}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => props.onSelect(topic.id)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              save();
              if (event.ctrlKey || event.metaKey) props.onAddChild(topic.id);
              else event.currentTarget.blur();
            } else if (event.key === "Escape") {
              setDraft(topic.text);
              event.currentTarget.blur();
            }
          }}
          aria-label="Texto do tópico"
          className={cn(
            "h-8 min-w-0 flex-1 rounded-md border-0 bg-transparent px-1.5 text-sm outline-none focus:bg-background/70 focus:ring-1 focus:ring-primary/40",
            depth === 0 && "font-semibold",
            topic.done && "text-muted-foreground line-through",
          )}
        />
      </div>
      {topic.children.length && !topic.collapsed ? (
        <ul role="group">
          {topic.children.map((child) => (
            <OutlineRow
              key={child.id}
              topic={child}
              depth={depth + 1}
              props={props}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Editable outline of the map (XMind "Outliner", MindMeister outline view). */
export function OutlinePanel(props: OutlinePanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
        <h2 className="text-sm font-semibold">Estrutura</h2>
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Fechar estrutura"
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </header>
      <p className="px-4 pb-2 text-xs text-muted-foreground">
        Edite o texto direto aqui. Ctrl+Enter cria um subtópico.
      </p>
      <ul
        role="tree"
        aria-label="Estrutura do mapa"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4"
      >
        {[props.doc.root, ...props.doc.floating].map((topic) => (
          <OutlineRow key={topic.id} topic={topic} depth={0} props={props} />
        ))}
      </ul>
    </div>
  );
}
