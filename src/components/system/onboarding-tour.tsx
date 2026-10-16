"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  Columns3,
  Compass,
  PartyPopper,
  Plus,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useUpdatePreferences } from "@/features/settings/use-settings";
import { normalizeThemePreference } from "@/lib/theme";
import type { ThemePreference } from "@/types/content";
import { Input } from "@/components/ui/input";
import { useCreateTask } from "@/features/tasks/use-tasks";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const doneKey = "flowy:onboarding-done";

interface SpotStep {
  target: string;
  title: string;
  body: string;
  icon: ReactNode;
}

const spotSteps: SpotStep[] = [
  {
    target: "quick-add",
    title: "Crie ou encontre em segundos",
    body: "Digite aqui para pesquisar. Escreva algo como “Reunião amanhã 15h” e aperte Enter: o Flowy entende a data e cria a tarefa.",
    icon: <Wand2 className="size-4" />,
  },
  {
    target: "scopes",
    title: "Veja o que importa agora",
    body: "Filtre por Hoje, Atrasadas, Próximas ou Concluídas com um toque.",
    icon: <CalendarDays className="size-4" />,
  },
  {
    target: "views",
    title: "Lista, Kanban ou Matriz",
    body: "Troque a forma de ver suas tarefas: em lista, em colunas por status ou na matriz de prioridades.",
    icon: <Columns3 className="size-4" />,
  },
  {
    target: "nav",
    title: "Tudo no mesmo lugar",
    body: "Pelo menu você acessa notas, fluxogramas, mapas mentais, pastas, etiquetas e a lixeira.",
    icon: <Compass className="size-4" />,
  },
  {
    target: "create",
    title: "Criar qualquer coisa",
    body: "Este botão cria tarefas, notas, fluxogramas e mapas mentais de qualquer tela.",
    icon: <Plus className="size-4" />,
  },
];

type Phase = "welcome" | "theme" | "task" | "spot" | "done";

const themes: { value: ThemePreference; label: string; bg: string; card: string; accent: string }[] = [
  { value: "purple", label: "Roxo", bg: "#0d041e", card: "#1a1033", accent: "#8b5cf6" },
  { value: "black", label: "Preto", bg: "#121212", card: "#1e1e1e", accent: "#f0f0f0" },
  { value: "oled", label: "OLED", bg: "#000000", card: "#111111", accent: "#ffffff" },
  { value: "white", label: "Claro", bg: "#f6f6f8", card: "#ffffff", accent: "#7c3aed" },
];

function findTarget(name: string) {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`);
  for (const element of candidates) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return element;
  }
  return null;
}

async function markDone() {
  try {
    window.localStorage.setItem(doneKey, "true");
  } catch {
    // The account flag below still applies.
  }
  try {
    await createClient().auth.updateUser({
      data: { onboarded_at: new Date().toISOString() },
    });
  } catch {
    // Offline: the local flag keeps the tour from returning on this device.
  }
}

export function OnboardingTour({ name }: { name: string }) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [spotIndex, setSpotIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [title, setTitle] = useState("Minha primeira tarefa no Flowy");
  const createTask = useCreateTask();
  const { theme: currentTheme, setTheme } = useTheme();
  const updatePreferences = useUpdatePreferences();
  const selectedTheme = normalizeThemePreference(currentTheme);

  function chooseTheme(value: ThemePreference) {
    setTheme(value);
    updatePreferences.mutate({ theme: value });
  }

  useEffect(() => {
    let done = false;
    try {
      done = window.localStorage.getItem(doneKey) === "true";
    } catch {
      done = false;
    }
    if (done) return;
    // Let the dashboard settle before the welcome card appears.
    const timer = window.setTimeout(() => setPhase("welcome"), 600);
    return () => window.clearTimeout(timer);
  }, []);

  const finish = useCallback(() => {
    setPhase(null);
    void markDone();
  }, []);

  const step = phase === "spot" ? spotSteps[spotIndex] : undefined;

  const measure = useCallback(() => {
    if (!step) return;
    const element = findTarget(step.target);
    if (!element) {
      setRect(null);
      return;
    }
    setRect(element.getBoundingClientRect());
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    const element = findTarget(step.target);
    element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const frame = window.requestAnimationFrame(measure);
    const settle = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step]);

  useEffect(() => {
    if (!phase) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish, phase]);

  if (!phase) return null;

  function next() {
    if (spotIndex < spotSteps.length - 1) setSpotIndex(spotIndex + 1);
    else setPhase("done");
  }

  function createFirstTask() {
    const value = title.trim();
    if (!value) return;
    const today = new Date();
    const dueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    createTask.mutate(
      { title: value, due_date: dueDate },
      { onSuccess: () => setPhase("spot") },
    );
  }

  const pad = 8;
  const spot = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;
  const cardBelow = spot ? spot.top + spot.height + 220 < window.innerHeight : true;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Tour do Flowy">
      {phase === "spot" && spot ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-primary/80 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            ...spot,
            boxShadow: "0 0 0 9999px rgb(5 5 12 / 0.72), 0 0 40px hsl(var(--primary) / 0.45)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgb(5_5_12/0.72)] backdrop-blur-sm animate-in fade-in" />
      )}

      {phase === "spot" && step ? (
        <div
          key={spotIndex}
          className={cn(
            "absolute left-1/2 w-[min(92vw,380px)] -translate-x-1/2 animate-in fade-in zoom-in-95 duration-300",
            !spot && "top-1/2 -translate-y-1/2",
          )}
          style={
            spot
              ? cardBelow
                ? { top: Math.min(spot.top + spot.height + 14, window.innerHeight - 220) }
                : { top: Math.max(spot.top - 14 - 200, 12) }
              : undefined
          }
        >
          <TourCard>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                {step.icon}
                Passo {spotIndex + 1} de {spotSteps.length}
              </span>
              <SkipButton onClick={finish} />
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.body}</p>
            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-1.5" aria-hidden="true">
                {spotSteps.map((item, index) => (
                  <span
                    key={item.target}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === spotIndex ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {spotIndex > 0 ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSpotIndex(spotIndex - 1)}>
                    Voltar
                  </Button>
                ) : null}
                <Button type="button" size="sm" onClick={next} className="gap-1.5">
                  {spotIndex === spotSteps.length - 1 ? "Concluir" : "Próximo"}
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </TourCard>
        </div>
      ) : null}

      {phase === "welcome" ? (
        <CenteredCard>
          <div className="flowy-tour-orb mx-auto grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-primary to-indigo-500 text-white shadow-[0_20px_50px_-10px_hsl(var(--primary)/0.7)]">
            <Sparkles className="size-7" />
          </div>
          <h2 className="mt-5 text-center text-2xl font-bold tracking-tight">
            Bem-vindo ao Flowy, {name}!
          </h2>
          <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
            Em menos de um minuto você escolhe seu visual, cria sua primeira tarefa e conhece as principais funções.
          </p>
          <div className="mt-6 grid gap-2">
            <Button type="button" onClick={() => setPhase("theme")} className="h-11 gap-2">
              Começar tutorial
              <ArrowRight className="size-4" />
            </Button>
            <Button type="button" variant="ghost" onClick={finish} className="text-muted-foreground">
              Pular introdução
            </Button>
          </div>
        </CenteredCard>
      ) : null}

      {phase === "theme" ? (
        <CenteredCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Seu estilo
            </span>
            <SkipButton onClick={finish} />
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight">Escolha o visual do Flowy</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Você pode trocar quando quiser em Configurações.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tema">
            {themes.map((option) => {
              const selected = selectedTheme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => chooseTheme(option.value)}
                  className={cn(
                    "group rounded-2xl border p-2 text-left transition-all duration-300 active:scale-95",
                    selected
                      ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <span
                    className="block h-20 overflow-hidden rounded-xl p-2"
                    style={{ backgroundColor: option.bg }}
                    aria-hidden="true"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: option.accent }} />
                      <span className="h-1.5 w-10 rounded-full opacity-40" style={{ backgroundColor: option.accent }} />
                    </span>
                    <span className="mt-2 block h-4 rounded-md" style={{ backgroundColor: option.card }} />
                    <span className="mt-1.5 block h-4 w-3/4 rounded-md" style={{ backgroundColor: option.card }} />
                  </span>
                  <span className="mt-2 flex items-center justify-between px-1 text-sm font-medium">
                    {option.label}
                    {selected ? <Check className="size-4 text-primary" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          <Button type="button" onClick={() => setPhase("task")} className="mt-5 h-11 w-full gap-2">
            Continuar
            <ArrowRight className="size-4" />
          </Button>
        </CenteredCard>
      ) : null}

      {phase === "task" ? (
        <CenteredCard>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Primeiro passo
            </span>
            <SkipButton onClick={finish} />
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight">Crie sua primeira tarefa</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Pode ser um teste. Ela vai aparecer na sua lista de hoje e você pode apagar depois.
          </p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              createFirstTask();
            }}
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              maxLength={200}
              aria-label="Título da tarefa"
              className="h-11"
            />
            {createTask.isError ? (
              <p className="text-xs text-destructive">
                Não foi possível criar a tarefa. Verifique sua conexão e tente de novo.
              </p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full gap-2"
              loading={createTask.isPending}
              disabled={!title.trim()}
            >
              <Check className="size-4" />
              Criar tarefa
            </Button>
          </form>
        </CenteredCard>
      ) : null}

      {phase === "done" ? (
        <CenteredCard>
          <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-success/15 text-success">
            <PartyPopper className="size-7" />
          </div>
          <h2 className="mt-5 text-center text-2xl font-bold tracking-tight">Tudo pronto!</h2>
          <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
            Sua primeira tarefa está na lista. Toque no círculo ao lado dela para concluir.
          </p>
          <Button type="button" onClick={finish} className="mt-6 h-11 w-full">
            Começar a usar o Flowy
          </Button>
        </CenteredCard>
      ) : null}
    </div>
  );
}

function TourCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/95 p-5 text-card-foreground shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] backdrop-blur-xl">
      {children}
    </div>
  );
}

function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-1/2 top-1/2 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
      <TourCard>{children}</TourCard>
    </div>
  );
}

function SkipButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      Pular
      <X className="size-3.5" />
    </button>
  );
}
