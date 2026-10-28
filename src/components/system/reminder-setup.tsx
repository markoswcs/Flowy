"use client";

import { BellRing, Check, Download, Share, SquarePlus, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { usePushNotifications } from "@/features/settings/use-push-notifications";
import { useInstallApp } from "@/hooks/use-install-app";
import { holdOverlay } from "@/lib/overlay";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// The illustrated steps only show inside the setup dialog.
const TutorialScene = dynamic(
  () => import("@/components/system/tutorial-scenes").then((mod) => mod.TutorialScene),
  { ssr: false, loading: () => <div className="aspect-[4/3] w-full rounded-2xl bg-muted/40" /> },
);

const DISMISS_KEY = "flowy:reminder-setup-dismissed";
/** A "Depois" hides the offer for a few days, then it comes back once more. */
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

function isDesktop() {
  return !/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

const ASKED_KEY = "flowy:reminder-asked";

function askedBefore(): boolean {
  try {
    return window.localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return true;
  }
}

function markAsked() {
  try {
    window.localStorage.setItem(ASKED_KEY, "1");
  } catch {
    // Private mode: the card on the home screen still offers it.
  }
}

function snoozed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private mode: the card simply shows again next time.
  }
}

function StepDots({ index, count }: { index: number; count: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full bg-muted-foreground/30 transition-all",
            i === index ? "w-6 bg-primary" : "w-1.5",
          )}
        />
      ))}
    </div>
  );
}

function Hint({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2.5 text-sm">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl flowy-active">
        {icon}
      </span>
      <span className="text-left">{children}</span>
    </li>
  );
}

function SetupDialog({
  push,
  onClose,
}: {
  push: ReturnType<typeof usePushNotifications>;
  onClose: () => void;
}) {
  const install = useInstallApp();
  const [ios] = useState(isIos);
  const [desktop] = useState(isDesktop);
  const installed = install.isInstalled;
  const [index, setIndex] = useState(installed ? 1 : 0);
  const enabled = push.status === "enabled";

  useEffect(() => {
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function enable() {
    try {
      await push.enable();
      setIndex(2);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível ativar.",
      );
    }
  }

  const steps = [
    {
      scene: "install" as const,
      title: "1. Instale o Flowy",
      body: installed ? (
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-500">
          <Check className="size-4" /> Já está instalado neste aparelho
        </p>
      ) : install.isInstallable ? (
        <button
          type="button"
          onClick={() => void install.installApp()}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
        >
          <Download className="size-4" /> Instalar agora
        </button>
      ) : ios ? (
        <ol className="space-y-2">
          <Hint icon={<Share className="size-4" />}>
            Toque em <strong>Compartilhar</strong> no Safari
          </Hint>
          <Hint icon={<SquarePlus className="size-4" />}>
            Escolha <strong>Adicionar à Tela de Início</strong>
          </Hint>
        </ol>
      ) : desktop ? (
        <ol className="space-y-2">
          <Hint icon={<Download className="size-4" />}>
            Na barra de endereço, clique no ícone <strong>Instalar</strong> (⊕)
          </Hint>
          <Hint icon={<SquarePlus className="size-4" />}>
            Ou no menu ⋮ › <strong>Instalar Flowy</strong>. Vira um atalho na
            área de trabalho.
          </Hint>
        </ol>
      ) : (
        <ol className="space-y-2">
          <Hint icon={<Download className="size-4" />}>
            No menu do navegador (⋮), toque em <strong>Instalar app</strong>
          </Hint>
        </ol>
      ),
    },
    {
      scene: "devices" as const,
      title: "2. Ative os lembretes",
      body: enabled ? (
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-500">
          <Check className="size-4" /> Lembretes ativados
        </p>
      ) : push.status === "needs-install" ? (
        <p className="rounded-2xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-400">
          No iPhone, abra o Flowy pelo ícone da Tela de Início e volte aqui.
        </p>
      ) : push.status === "denied" ? (
        <p className="rounded-2xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-600 dark:text-amber-400">
          As notificações estão bloqueadas. Libere nas configurações do
          navegador ou do aparelho.
        </p>
      ) : push.status === "unsupported" ? (
        <p className="rounded-2xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
          Este navegador não recebe notificações. Use o app instalado.
        </p>
      ) : (
        <button
          type="button"
          disabled={push.busy || push.status === "loading"}
          onClick={() => void enable()}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <BellRing className="size-4" /> Ativar lembretes
        </button>
      ),
    },
    {
      scene: "done" as const,
      title: "Pronto!",
      body: (
        <p className="text-sm text-muted-foreground">
          Os lembretes chegam neste aparelho. Repita no celular ou no computador
          para receber nos dois.
        </p>
      ),
    },
  ];
  const step = steps[index] ?? steps[0]!;
  const last = index === steps.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="flowy-glass-scrim absolute inset-0 animate-fade-in"
        aria-label="Fechar"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-setup-title"
        className="flowy-glass flowy-glass-strong relative w-full max-w-md animate-in rounded-t-[1.75rem] border p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] fade-in slide-in-from-bottom-6 sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
        <p className="text-xs font-semibold uppercase tracking-widest flowy-ink">
          Lembretes no celular e no computador
        </p>
        <div
          key={index}
          className="mt-4 flex animate-in flex-col items-center gap-4 text-center fade-in slide-in-from-right-4"
        >
          <div className="grid w-full place-items-center rounded-3xl bg-gradient-to-br from-primary/15 to-fuchsia-500/10 py-3 ring-1 ring-primary/20">
            <TutorialScene id={step.scene} />
          </div>
          <h2 id="reminder-setup-title" className="text-xl font-semibold">
            {step.title}
          </h2>
          <div className="w-full">{step.body}</div>
        </div>
        <div className="mt-5">
          <StepDots index={index} count={steps.length} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => (index === 0 ? onClose() : setIndex(index - 1))}
            className="min-h-12 rounded-2xl border text-sm font-medium hover:bg-accent"
          >
            {index === 0 ? "Depois" : "Voltar"}
          </button>
          <button
            type="button"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
            className="min-h-12 rounded-2xl bg-foreground/10 text-sm font-semibold hover:bg-foreground/15"
          >
            {last ? "Concluir" : "Próximo"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

/**
 * Asked once, right after the installed app first opens: one tap turns
 * reminders on. The browser's own permission prompt follows that tap.
 */
function AskOnceSheet({
  push,
  onDone,
}: {
  push: ReturnType<typeof usePushNotifications>;
  onDone: () => void;
}) {
  useEffect(() => holdOverlay(), []);

  async function enable() {
    markAsked();
    try {
      await push.enable();
      toast.success("Lembretes ativados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ativar.");
    }
    onDone();
  }

  function later() {
    markAsked();
    snooze();
    onDone();
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-3 sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Fechar"
        onClick={later}
        className="flowy-glass-scrim absolute inset-0 animate-in fade-in"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-ask-title"
        className="relative w-full max-w-sm animate-in rounded-3xl border border-border/60 bg-card p-5 text-center shadow-2xl fade-in slide-in-from-bottom-4"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl flowy-active">
          <BellRing className="tut-swing-icon size-7" aria-hidden="true" />
        </span>
        <h2 id="reminder-ask-title" className="mt-4 text-lg font-semibold">
          Quer que o Flowy te lembre?
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Um aviso na hora de cada tarefa e um resumo do dia às 8h. Dá para
          desligar quando quiser em Configurações.
        </p>
        <div className="mt-5 grid gap-2">
          <button
            type="button"
            onClick={() => void enable()}
            disabled={push.busy}
            className="min-h-12 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-70"
          >
            Ativar lembretes
          </button>
          <button
            type="button"
            onClick={later}
            className="min-h-11 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Agora não
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

/**
 * Home screen card for people who still don't get reminders. Where they can
 * be turned on right here (installed app, computer) it is a one-tap "Ativar";
 * elsewhere it explains, in two animated steps, installing and turning on.
 */
export function ReminderSetupCard() {
  const push = usePushNotifications();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [direct, setDirect] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    // Storage is read after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(snoozed());
    setDirect(isStandalone() || isDesktop());
  }, []);

  const needed =
    push.status !== "loading" &&
    push.status !== "enabled" &&
    push.status !== "unsupported";
  const canEnableHere = direct && push.status === "disabled";

  // The installed app asks once, a moment after it opens, unless something
  // else (the welcome tour) is already on screen.
  useEffect(() => {
    if (push.status !== "disabled" || !isStandalone() || askedBefore() || snoozed()) return;
    const timeout = window.setTimeout(() => {
      if (!document.body.classList.contains("has-overlay")) setAsking(true);
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [push.status]);

  async function enableHere() {
    try {
      await push.enable();
      toast.success("Lembretes ativados");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ativar.");
    }
  }

  return (
    <>
      {needed && !hidden ? (
        <div className="flex animate-in items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] p-3 fade-in slide-in-from-top-2 sm:p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl flowy-active">
            <BellRing className="tut-swing-icon size-5" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-sm leading-5">
            <strong className="font-semibold">
              Receba lembretes no celular e no PC
            </strong>
            <span className="block text-muted-foreground">
              {canEnableHere
                ? "Um toque e você recebe o aviso na hora de cada tarefa."
                : "2 passos em cada aparelho: instalar e ativar."}
            </span>
          </p>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            {canEnableHere ? (
              <button
                type="button"
                onClick={() => void enableHere()}
                disabled={push.busy}
                className="min-h-10 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-70"
              >
                Ativar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="min-h-10 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Ver como
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                snooze();
                setHidden(true);
              }}
              className="min-h-10 rounded-xl px-3.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Depois
            </button>
          </div>
        </div>
      ) : null}
      {open ? <SetupDialog push={push} onClose={() => setOpen(false)} /> : null}
      {asking && push.status === "disabled" ? (
        <AskOnceSheet push={push} onDone={() => setAsking(false)} />
      ) : null}
    </>
  );
}
