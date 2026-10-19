"use client";

import { Check, Mic, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useVoiceInput } from "@/features/tasks/use-voice-input";
import { cn } from "@/lib/utils";

/**
 * Microphone button that dictates a task. While listening it shows a small
 * sheet with the live transcript and clear finish/cancel controls; the text is
 * handed to `onResult` only when the person finishes.
 */
export function VoiceTaskButton({
  onResult,
  autoStart = false,
  className,
}: {
  onResult: (text: string) => void;
  autoStart?: boolean;
  className?: string;
}) {
  const voice = useVoiceInput({ onFinal: onResult });
  const started = useRef(false);
  const { start } = voice;

  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    start();
  }, [autoStart, start]);

  const open = voice.status !== "idle";

  return (
    <>
      <button
        type="button"
        onClick={voice.status === "listening" ? voice.stop : voice.start}
        aria-label={
          voice.status === "listening"
            ? "Parar de ouvir"
            : "Ditar tarefa por voz"
        }
        title="Ditar tarefa por voz"
        aria-pressed={voice.status === "listening"}
        data-no-glow
        className={cn(
          "relative grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
          voice.status === "listening" && "bg-rose-500/15 text-rose-500",
          className,
        )}
      >
        <Mic className="size-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Ditando tarefa"
          className="fixed inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)] z-[120] mx-auto max-w-md animate-in fade-in slide-in-from-bottom-2 md:bottom-8"
        >
          <div className="flowy-glass flowy-glass-strong rounded-3xl border p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="relative grid size-11 shrink-0 place-items-center">
                {voice.status === "listening" ? (
                  <span
                    className="absolute inset-0 animate-ping rounded-full bg-rose-500/30"
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  className={cn(
                    "relative grid size-11 place-items-center rounded-full text-white",
                    voice.status === "listening"
                      ? "bg-rose-500"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Mic className="size-5" aria-hidden="true" />
                </span>
              </span>
              <div className="min-w-0 flex-1" aria-live="polite">
                <p className="text-sm font-semibold">
                  {voice.status === "listening"
                    ? "Ouvindo…"
                    : "Microfone indisponível"}
                </p>
                <p
                  className={cn(
                    "line-clamp-3 text-sm",
                    voice.error ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {voice.error ??
                    (voice.transcript ||
                      "Fale a tarefa: o quê, quando e para quem.")}
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={voice.cancel}
                className="flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
                {voice.error ? "Fechar" : "Cancelar"}
              </button>
              {voice.status === "listening" ? (
                <button
                  type="button"
                  onClick={voice.stop}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="size-4" aria-hidden="true" />
                  Concluir
                </button>
              ) : (
                <button
                  type="button"
                  onClick={voice.start}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Mic className="size-4" aria-hidden="true" />
                  Tentar de novo
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
