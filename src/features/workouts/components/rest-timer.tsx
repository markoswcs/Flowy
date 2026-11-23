"use client";

import { Plus, Timer, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { notify } from "@/providers/notification-provider";

interface RestState {
  endsAt: number;
  total: number;
  label: string;
}

let state: RestState | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Starts (or restarts) the rest countdown after a set. */
export function startRest(seconds: number, label: string) {
  if (seconds <= 0) return;
  state = { endsAt: Date.now() + seconds * 1000, total: seconds, label };
  emit();
}

function addRest(seconds: number) {
  if (!state) return;
  state = { ...state, endsAt: state.endsAt + seconds * 1000, total: state.total + seconds };
  emit();
}

function stopRest() {
  state = null;
  emit();
}

function secondsLeft(now: number) {
  return state ? Math.max(0, Math.ceil((state.endsAt - now) / 1000)) : 0;
}

function chime() {
  try {
    const audio = new AudioContext();
    const gain = audio.createGain();
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 1);
    [660, 880, 1320].forEach((frequency, index) => {
      const tone = audio.createOscillator();
      tone.frequency.value = frequency;
      tone.connect(gain);
      tone.start(audio.currentTime + index * 0.14);
      tone.stop(audio.currentTime + 1);
    });
  } catch {
    // Sound not allowed yet: the vibration and the banner still tell.
  }
}

function useNow(active: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick);
    const timer = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [active]);
  return now;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Floating countdown between sets: +15 s, skip, and a chime with a buzz at the end. */
export function RestTimerBar() {
  const rest = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => null,
  );
  const now = useNow(Boolean(rest));
  const left = rest && now ? secondsLeft(now) : rest?.total ?? 0;

  useEffect(() => {
    if (!rest || !now || left > 0) return;
    chime();
    navigator.vibrate?.([250, 120, 250]);
    notify(`Descanso acabou: próxima série de ${rest.label}`);
    stopRest();
  }, [rest, now, left]);

  if (!rest) return null;
  const progress = rest.total ? 1 - left / rest.total : 1;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={`Descanso: ${clock(left)}`}
      className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-primary/40 bg-card/95 p-2.5 pl-3.5 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-3 md:bottom-6"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-300 ease-linear"
        style={{ width: `${progress * 100}%` }}
      />
      <Timer className="relative size-5 shrink-0 flowy-ink" aria-hidden="true" />
      <div className="relative min-w-0 flex-1">
        <p className="text-xl font-bold tabular-nums leading-none">{clock(left)}</p>
        <p className="truncate text-xs text-muted-foreground">Descanso · {rest.label}</p>
      </div>
      <button
        type="button"
        onClick={() => addRest(15)}
        className="relative inline-flex h-9 items-center gap-1 rounded-xl border border-border/60 px-2.5 text-sm font-medium hover:bg-muted/50"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        15 s
      </button>
      <button
        type="button"
        onClick={stopRest}
        aria-label="Pular descanso"
        className="relative grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
