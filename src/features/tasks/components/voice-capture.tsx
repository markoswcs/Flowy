"use client";

import { Check, Mic, MicOff, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useVoiceInput } from "@/features/tasks/use-voice-input";
import { cn } from "@/lib/utils";

function isInstalledApp() {
  try {
    return window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    return false;
  }
}

/**
 * Microphone button that dictates a task. The sheet it opens asks for the
 * microphone when needed, shows the live transcript while listening and has
 * clear finish/cancel controls; the text reaches `onResult` only on finish.
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
    void start();
  }, [autoStart, start]);

  const listening = voice.status === "listening";

  return (
    <>
      <button
        type="button"
        onClick={listening ? voice.stop : () => void voice.start()}
        aria-label={listening ? "Parar de ouvir" : "Ditar tarefa por voz"}
        title="Ditar tarefa por voz"
        aria-pressed={listening}
        data-no-glow
        className={cn(
          "relative grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60",
          listening && "bg-rose-500/15 text-rose-500",
          className,
        )}
      >
        <Mic className="size-4" aria-hidden="true" />
      </button>

      {voice.status !== "idle" ? <VoiceSheet voice={voice} /> : null}
    </>
  );
}

function VoiceSheet({ voice }: { voice: ReturnType<typeof useVoiceInput> }) {
  // Portal to <body>: a blurred ancestor (the quick bar) would otherwise
  // become the containing block of this fixed sheet and pull it up the page.
  const [installed] = useState(isInstalledApp);
  const primary =
    "flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95";
  const secondary =
    "flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  let icon: ReactNode = <Mic className="size-5" aria-hidden="true" />;
  let title = "Ouvindo…";
  let body: ReactNode = (
    <p className="text-sm text-muted-foreground">
      {voice.transcript || "Fale a tarefa: o quê, quando e para quem."}
    </p>
  );
  let actions: ReactNode = (
    <>
      <button type="button" onClick={voice.cancel} className={secondary}>
        <X className="size-4" aria-hidden="true" />
        Cancelar
      </button>
      <button type="button" onClick={voice.stop} className={primary}>
        <Check className="size-4" aria-hidden="true" />
        Concluir
      </button>
    </>
  );

  if (voice.status === "asking") {
    title = "Permitir o microfone";
    body = (
      <p className="text-sm text-muted-foreground">
        Para ditar tarefas, o Flowy precisa ouvir você enquanto esta janela
        estiver aberta. Nada é gravado.
      </p>
    );
    actions = (
      <>
        <button type="button" onClick={voice.cancel} className={secondary}>
          Agora não
        </button>
        <button
          type="button"
          onClick={() => void voice.allow()}
          className={primary}
        >
          <Mic className="size-4" aria-hidden="true" />
          Permitir microfone
        </button>
      </>
    );
  } else if (voice.status === "blocked") {
    icon = <MicOff className="size-5" aria-hidden="true" />;
    title = "Microfone bloqueado";
    const steps = installed
      ? [
          "Toque e segure o ícone do Flowy na tela inicial",
          "Informações do app › Permissões",
          "Microfone › Permitir",
        ]
      : [
          "Toque no ícone ao lado do endereço do site",
          "Permissões › Microfone",
          "Escolha Permitir",
        ];
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          O pedido de acesso foi recusado antes, e só você pode liberar:
        </p>
        <ol className="mt-2 space-y-1 text-sm">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-semibold flowy-ink">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </>
    );
    actions = (
      <>
        <button type="button" onClick={voice.cancel} className={secondary}>
          Fechar
        </button>
        <button
          type="button"
          onClick={() => void voice.allow()}
          className={primary}
        >
          Já liberei
        </button>
      </>
    );
  } else if (voice.status === "error") {
    icon = <MicOff className="size-5" aria-hidden="true" />;
    title = "Não deu para ouvir";
    body = <p className="text-sm text-destructive">{voice.error}</p>;
    actions = (
      <>
        <button type="button" onClick={voice.cancel} className={secondary}>
          Fechar
        </button>
        <button
          type="button"
          onClick={() => void voice.start()}
          className={primary}
        >
          <Mic className="size-4" aria-hidden="true" />
          Tentar de novo
        </button>
      </>
    );
  }

  const listening = voice.status === "listening";

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end justify-center p-3 pb-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)] md:items-center md:pb-3">
      <button
        type="button"
        aria-label="Fechar"
        onClick={voice.cancel}
        className="flowy-glass-scrim absolute inset-0 animate-fade-in"
        data-no-glow
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-3 rounded-3xl border border-border/70 bg-card p-4 text-card-foreground shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="relative grid size-11 shrink-0 place-items-center">
            {listening ? (
              <span
                className="absolute inset-0 animate-ping rounded-full bg-rose-500/30"
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                "relative grid size-11 place-items-center rounded-full",
                listening
                  ? "bg-rose-500 text-white"
                  : voice.status === "asking"
                    ? "bg-primary/15 flowy-ink"
                    : "bg-destructive/15 text-destructive",
              )}
            >
              {icon}
            </span>
          </span>
          <div className="min-w-0 flex-1 pt-0.5" aria-live="polite">
            <p className="font-semibold">{title}</p>
            <div className="mt-1">{body}</div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
