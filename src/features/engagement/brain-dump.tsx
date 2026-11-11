"use client";

import { Moon, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { tomorrowDateKey } from "@/features/tasks/date-utils";
import { parseQuickTask } from "@/features/tasks/quick-task";
import { useCreateTask } from "@/features/tasks/use-tasks";
import { holdOverlay } from "@/lib/overlay";
import { notify } from "@/providers/notification-provider";

export const OPEN_DUMP_EVENT = "flowy:open-brain-dump";

/**
 * One task per line. A line that says when keeps it ("Dentista sexta 15h");
 * the others go to tomorrow, which is what is on the mind at night.
 */
export function dumpToTasks(text: string, now = new Date()) {
  const tomorrow = tomorrowDateKey(now);
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const parsed = parseQuickTask(line, now);
      return {
        title: (parsed.title || line).slice(0, 300),
        due_date: parsed.due_date ?? tomorrow,
        due_time: parsed.due_date ? parsed.due_time : null,
      };
    });
}

/** "Esvaziar a cabeça": write everything at once, each line becomes a task. */
export function BrainDump() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const create = useCreateTask();

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_DUMP_EVENT, show);
    // The 21h notification opens the app with ?despejar=1.
    const url = new URL(window.location.href);
    let timer = 0;
    if (url.searchParams.has("despejar")) {
      url.searchParams.delete("despejar");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      timer = window.setTimeout(show);
    }
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_DUMP_EVENT, show);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release?.();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  const tasks = dumpToTasks(text);

  async function save() {
    setSaving(true);
    try {
      for (const task of tasks) await create.mutateAsync(task);
      notify(`${tasks.length} ${tasks.length === 1 ? "tarefa anotada" : "tarefas anotadas"}. Boa noite! 🌙`);
      setText("");
      setOpen(false);
    } catch {
      // The error banner already explains; what was written stays here.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="dump-title">
      <div className="w-full max-w-lg rounded-3xl border border-border/60 bg-card p-5 shadow-soft animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="dump-title" className="flex items-center gap-2 text-lg font-semibold">
              <Moon className="size-5 flowy-ink" aria-hidden="true" />
              Esvaziar a cabeça
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Uma coisa por linha. Sem data, vai para amanhã.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={() => setOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          placeholder={"Levar o carro na revisão\nLigar para a dentista 10h\nProva de Física sexta"}
          aria-label="O que você precisa lembrar, uma coisa por linha"
          className="mt-4 w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
        />
        <Button type="button" className="mt-3 h-11 w-full" disabled={!tasks.length} loading={saving} onClick={() => void save()}>
          {tasks.length ? `Anotar ${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"}` : "Anotar"}
        </Button>
      </div>
    </div>
  );
}
