"use client";

import { Bell, Check, CheckCircle2, Folder, NotebookPen, Plus, Tag, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";

import { useCategories } from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { useNotes } from "@/features/notes/use-notes";
import { usePushNotifications } from "@/features/settings/use-push-notifications";
import { useTasks } from "@/features/tasks/use-tasks";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const dismissedKey = "flowy:getting-started-dismissed";
const changeEvent = "flowy:getting-started-change";

function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

function readDismissed() {
  try {
    return window.localStorage.getItem(dismissedKey) === "true";
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    window.localStorage.setItem(dismissedKey, "true");
  } catch {
    // Without storage the card simply returns next visit.
  }
  window.dispatchEvent(new Event(changeEvent));
}

// Reminders count as set up once any of the person's devices is registered,
// so the checklist shows the same progress on the phone and on the computer.
async function countPushDevices() {
  const { count, error } = await createClient()
    .from("push_subscriptions")
    .select("endpoint", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

interface Step {
  id: string;
  label: string;
  done: boolean;
  icon: ReactNode;
  action: () => void;
}

/** A short checklist that walks new people through the features worth trying. */
export function GettingStarted() {
  const router = useRouter();
  // Hidden on the server and until storage is read, so it never flashes.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  const open = useTasks({ scope: "all" }).data;
  const completed = useTasks({ scope: "completed" }).data;
  const folders = useFolders().data;
  const categories = useCategories().data;
  const notes = useNotes().data;
  const push = usePushNotifications();
  const pushDevices = useQuery({
    queryKey: ["push-devices"],
    queryFn: countPushDevices,
    staleTime: 60_000,
  }).data;

  if (dismissed || !open || !completed || !folders || !categories || !notes) return null;

  const steps: Step[] = [
    {
      id: "task",
      label: "Criar uma tarefa",
      done: open.length + completed.length > 0,
      icon: <Plus className="size-4" />,
      action: () => window.dispatchEvent(new Event("flowy:open-task-composer")),
    },
    {
      id: "complete",
      label: "Concluir uma tarefa",
      done: completed.length > 0,
      icon: <CheckCircle2 className="size-4" />,
      action: () => document.querySelector<HTMLElement>("[data-tour='quick-add']")?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      id: "folder",
      label: "Criar uma pasta",
      done: folders.length > 0,
      icon: <Folder className="size-4" />,
      action: () => window.dispatchEvent(new CustomEvent("flowy:open-organizer", { detail: "folders" })),
    },
    {
      id: "tag",
      label: "Etiquetar uma tarefa",
      done: [...open, ...completed].some((task) => task.categories.length > 0),
      icon: <Tag className="size-4" />,
      action: () =>
        categories.length
          ? window.dispatchEvent(new Event("flowy:open-task-composer"))
          : window.dispatchEvent(new CustomEvent("flowy:open-organizer", { detail: "categories" })),
    },
    {
      id: "note",
      label: "Escrever uma nota",
      done: notes.length > 0,
      icon: <NotebookPen className="size-4" />,
      action: () => router.push("/app/notes?tipo=nota"),
    },
  ];
  const pushDone = push.status === "enabled" || (pushDevices ?? 0) > 0;
  if (pushDone || (push.status !== "unsupported" && push.status !== "loading")) {
    steps.push({
      id: "push",
      label: "Ativar lembretes",
      done: pushDone,
      icon: <Bell className="size-4" />,
      action: () => router.push("/app/settings"),
    });
  }

  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  const progress = doneCount / steps.length;

  return (
    <section
      aria-labelledby="getting-started-title"
      className="flowy-glass animate-in rounded-3xl border p-4 fade-in slide-in-from-bottom-2 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="relative grid size-11 shrink-0 place-items-center" aria-hidden="true">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" className="stroke-muted-foreground/20" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="stroke-primary transition-[stroke-dashoffset] duration-700"
              strokeDasharray={94.25}
              strokeDashoffset={94.25 * (1 - progress)}
            />
          </svg>
          <span className="text-xs font-bold">
            {doneCount}/{steps.length}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="getting-started-title" className="font-semibold tracking-tight">
            Primeiros passos
          </h2>
          <p className="text-xs text-muted-foreground">Complete e descubra tudo o que o Flowy faz por você.</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Ocultar primeiros passos"
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.id} className="animate-in fade-in zoom-in-95" style={{ animationDelay: `${index * 50}ms` }}>
            <button
              type="button"
              onClick={step.action}
              disabled={step.done}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm transition-all duration-300",
                step.done
                  ? "border-success/30 bg-success/10 text-muted-foreground"
                  : "border-border/60 bg-background/40 hover:-translate-y-0.5 hover:border-primary/50 active:scale-[0.98]",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-xl",
                  step.done ? "bg-success text-success-foreground" : "bg-primary/15 text-primary",
                )}
              >
                {step.done ? <Check className="size-4" strokeWidth={3} /> : step.icon}
              </span>
              <span className={cn("min-w-0 leading-tight", step.done && "line-through decoration-2")}>
                {step.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
