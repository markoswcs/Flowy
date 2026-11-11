"use client";

import { Check, Coffee, Pause, Play, SkipForward, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { celebrateIfDayCleared } from "@/features/tasks/day-cleared";
import { localDateKey } from "@/features/tasks/date-utils";
import { useTasks, useUpdateTask } from "@/features/tasks/use-tasks";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import {
  BREAK_MINUTES,
  FOCUS_MINUTES,
  clock,
  focusQueue,
  nextTask,
  remaining,
  type FocusTimer,
} from "./next-task";

const KEY = "flowy:focus-timer";
const listeners = new Set<() => void>();

function readTimer(): FocusTimer | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FocusTimer) : null;
  } catch {
    return null;
  }
}

let cached: { raw: string | null; value: FocusTimer | null } = { raw: null, value: null };
function snapshot(): FocusTimer | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cached.raw) cached = { raw, value: raw ? readTimer() : null };
  return cached.value;
}

/** The timer survives leaving the page or closing the app. */
function saveTimer(timer: FocusTimer | null) {
  try {
    if (timer) window.localStorage.setItem(KEY, JSON.stringify(timer));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private mode: the timer simply does not survive a reload.
  }
  listeners.forEach((listener) => listener());
}

function startPhase(taskId: string | null, mode: FocusTimer["mode"]) {
  const minutes = mode === "focus" ? FOCUS_MINUTES : BREAK_MINUTES;
  saveTimer({ taskId, mode, endsAt: Date.now() + minutes * 60_000 });
}

function useTimer() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    () => null,
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

async function ring(title: string, body: string) {
  navigator.vibrate?.([200, 100, 200]);
  try {
    if (Notification.permission !== "granted") return;
    const registration = await navigator.serviceWorker?.ready;
    await registration?.showNotification(title, { body, icon: "/icon-192.png", tag: "flowy-focus" });
  } catch {
    // No notifications here: the screen already shows it.
  }
}

/**
 * One thing at a time: the most important task of today alone on the
 * screen, with a 25-minute focus timer and a 5-minute break.
 */
export function FocusPage() {
  const today = localDateKey();
  const tasks = useTasks({ scope: "today" });
  const update = useUpdateTask();
  const queryClient = useQueryClient();
  const [skipped, setSkipped] = useState<string[]>([]);
  const timer = useTimer();
  const now = useNow(Boolean(timer));
  const left = timer ? remaining(timer, now) : 0;

  const list = tasks.data ?? [];
  const pinned = timer?.taskId ? list.find((task) => task.id === timer.taskId && task.status !== "completed") : null;
  const task = pinned ?? nextTask(list, today, skipped);
  const queueSize = focusQueue(list, today).length;

  // Time is up: from focus to a break, from a break back to the list.
  useEffect(() => {
    if (!timer || left > 0) return;
    if (timer.mode === "focus") {
      startPhase(timer.taskId, "break");
      void ring("Foco concluído 🎯", `Hora de uma pausa de ${BREAK_MINUTES} minutos.`);
    } else {
      saveTimer(null);
      void ring("Pausa acabou ☕", "Bora para a próxima?");
    }
  }, [timer, left]);

  function start() {
    startPhase(task?.id ?? null, "focus");
  }

  function complete() {
    if (!task) return;
    saveTimer(null);
    update
      .mutateAsync({ id: task.id, status: "completed", completed_at: new Date().toISOString() })
      .then(() => celebrateIfDayCleared(queryClient, task))
      .catch(() => undefined);
  }

  function skip() {
    if (!task) return;
    saveTimer(null);
    setSkipped((current) => [...current.filter((id) => id !== task.id), task.id]);
  }

  const total = (timer?.mode === "break" ? BREAK_MINUTES : FOCUS_MINUTES) * 60;
  const progress = timer ? 1 - left / total : 0;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          <Target className="size-6 flowy-ink" aria-hidden="true" />
          Foco
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Uma coisa de cada vez. O resto espera.</p>
      </header>

      {tasks.isLoading ? (
        <Skeleton className="h-80 w-full rounded-3xl" />
      ) : !task ? (
        <section className="rounded-3xl border border-border/60 bg-card/50 p-8 text-center">
          <p className="text-4xl" aria-hidden="true">🎉</p>
          <h2 className="mt-2 text-lg font-semibold">Nada pendente para hoje</h2>
          <p className="mt-1 text-sm text-muted-foreground">Aproveite o tempo livre ou adiante algo de amanhã.</p>
          <Link href="/app" className="mt-4 inline-block text-sm font-medium flowy-ink underline-offset-4 hover:underline">
            Voltar ao Início
          </Link>
        </section>
      ) : (
        <section className="rounded-3xl border border-border/60 bg-card/50 p-6 text-center sm:p-8" aria-label="Tarefa em foco">
          <p className="text-xs font-semibold uppercase tracking-widest flowy-ink">
            {timer?.mode === "break" ? "Pausa" : "Agora"}
            {queueSize > 1 ? ` · mais ${queueSize - 1} hoje` : ""}
          </p>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-balance">{task.title}</h2>
          {task.due_time || task.priority === "high" || (task.due_date && task.due_date < today) ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {[
                task.priority === "high" ? "Importante" : null,
                task.due_date && task.due_date < today ? "Atrasada" : null,
                task.due_time ? `às ${task.due_time.slice(0, 5)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}

          <div className="relative mx-auto mt-6 grid size-48 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={timer?.mode === "break" ? "#34d399" : "#8b5cf6"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <div>
              <p className="font-mono text-4xl font-bold tabular-nums" aria-live="off">
                {clock(timer ? left : FOCUS_MINUTES * 60)}
              </p>
              <p className="text-xs text-muted-foreground">
                {timer ? (timer.mode === "break" ? "de pausa" : "de foco") : `${FOCUS_MINUTES} min de foco`}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            {timer ? (
              <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => saveTimer(null)}>
                <Pause className="size-4" />
                Parar o cronômetro
              </Button>
            ) : (
              <Button type="button" className="h-12 gap-2 text-base" onClick={start}>
                <Play className="size-4" />
                Começar {FOCUS_MINUTES} min de foco
              </Button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                onClick={complete}
                loading={update.isPending}
              >
                <Check className="size-4" />
                Concluí
              </Button>
              <Button type="button" variant="ghost" className="h-11 gap-2" onClick={skip} disabled={queueSize < 2}>
                <SkipForward className="size-4" />
                Outra
              </Button>
            </div>
          </div>
          <p className={cn("mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground", !timer && "invisible")}>
            <Coffee className="size-3.5" aria-hidden="true" />
            Depois do foco vem uma pausa de {BREAK_MINUTES} minutos.
          </p>
        </section>
      )}
    </div>
  );
}
