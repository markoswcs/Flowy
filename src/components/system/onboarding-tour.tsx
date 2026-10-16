"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  Columns3,
  Compass,
  Folder,
  Hash,
  Plus,
  Sparkles,
  Tag,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoryKeys, useCategories } from "@/features/categories/use-categories";
import { folderKeys, useFolders } from "@/features/folders/use-folders";
import {
  DEFAULT_STARTER_PROFILE as defaultProfile,
  missingStarterItems,
  STARTER_FOLDERS,
  STARTER_PROFILES,
  STARTER_TAGS,
  type StarterItem,
} from "@/features/onboarding/starter-kits";
import { useUpdatePreferences } from "@/features/settings/use-settings";
import { formatTaskDate, localDateKey } from "@/features/tasks/date-utils";
import { parseQuickTask } from "@/features/tasks/quick-task";
import { normalize, suggestOrganization } from "@/features/tasks/smart-organize";
import { useCreateTask } from "@/features/tasks/use-tasks";
import { createClient } from "@/lib/supabase/client";
import { normalizeThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { createCategory } from "@/services/categories";
import { createFolder } from "@/services/folders";
import type { ThemePreference } from "@/types/content";

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
    title: "Escreva e aperte Enter",
    body: "“Pagar conta sexta 10h #urgente /pessoal” já vira tarefa com data, etiqueta e pasta.",
    icon: <Wand2 className="size-4" />,
  },
  {
    target: "scopes",
    title: "Foque no que importa",
    body: "Hoje, Atrasadas, Próximas ou Concluídas: um toque e pronto.",
    icon: <CalendarDays className="size-4" />,
  },
  {
    target: "views",
    title: "Veja do seu jeito",
    body: "Lista, Kanban ou Matriz de prioridades.",
    icon: <Columns3 className="size-4" />,
  },
  {
    target: "nav",
    title: "Pastas e etiquetas moram aqui",
    body: "No menu você abre cada pasta, cada etiqueta, suas notas e diagramas. No celular, toque na sua foto lá em cima.",
    icon: <Compass className="size-4" />,
  },
  {
    target: "create",
    title: "Criar de qualquer tela",
    body: "Tarefa, nota, diagrama ou mapa mental. Atalho no computador: Ctrl + N.",
    icon: <Plus className="size-4" />,
  },
];

type Phase = "welcome" | "theme" | "organize" | "task" | "spot" | "done";

const progressPhases: Phase[] = ["theme", "organize", "task", "spot"];

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

interface OnboardingTourProps {
  name: string;
  /** Opened from Settings: ignore the "already seen" flag. */
  replay?: boolean;
  onClose?: () => void;
}

export function OnboardingTour({ name, replay = false, onClose }: OnboardingTourProps) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [spotIndex, setSpotIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let done = false;
    try {
      done = !replay && window.localStorage.getItem(doneKey) === "true";
    } catch {
      done = false;
    }
    if (done) return;
    // Let the dashboard settle before the welcome card appears.
    const timer = window.setTimeout(() => setPhase("welcome"), replay ? 150 : 600);
    return () => window.clearTimeout(timer);
  }, [replay]);

  const finish = useCallback(() => {
    setPhase(null);
    void markDone();
    onClose?.();
  }, [onClose]);

  const step = phase === "spot" ? spotSteps[spotIndex] : undefined;

  const measure = useCallback(() => {
    if (!step) return;
    const element = findTarget(step.target);
    setRect(element ? element.getBoundingClientRect() : null);
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
            boxShadow: "0 0 0 9999px rgb(5 5 12 / 0.62), 0 0 40px hsl(var(--primary) / 0.45)",
          }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl ring-2 ring-primary"
            style={{ animation: "flowy-pulse-ring 1.6s cubic-bezier(0.16,1,0.3,1) infinite" }}
          />
        </div>
      ) : (
        <div className="flowy-glass-scrim absolute inset-0 animate-in fade-in">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 size-[min(120vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 65%)" }}
          />
        </div>
      )}

      {phase === "spot" && step ? (
        <div
          key={spotIndex}
          className={cn(
            "absolute left-1/2 w-[min(92vw,380px)] -translate-x-1/2 animate-in fade-in zoom-in-95",
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
                {spotIndex + 1} de {spotSteps.length}
              </span>
              <SkipButton onClick={finish} />
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.body}</p>
            <div className="mt-5 flex items-center justify-between">
              <Dots count={spotSteps.length} active={spotIndex} />
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
        <WelcomeStep name={name} onStart={() => setPhase("theme")} onSkip={finish} />
      ) : null}
      {phase === "theme" ? <ThemeStep onNext={() => setPhase("organize")} onSkip={finish} /> : null}
      {phase === "organize" ? <OrganizeStep onNext={() => setPhase("task")} onSkip={finish} /> : null}
      {phase === "task" ? (
        <TaskStep
          onNext={() => {
            setSpotIndex(0);
            setPhase("spot");
          }}
          onSkip={finish}
        />
      ) : null}
      {phase === "done" ? <DoneStep onFinish={finish} /> : null}
    </div>
  );
}

function WelcomeStep({ name, onStart, onSkip }: { name: string; onStart: () => void; onSkip: () => void }) {
  const perks = [
    { icon: <Zap className="size-4" />, text: "Anote em 2 segundos, com data automática" },
    { icon: <Folder className="size-4" />, text: "Pastas e etiquetas prontas para você" },
    { icon: <Bell className="size-4" />, text: "Lembretes no celular na hora certa" },
  ];
  return (
    <CenteredCard phase="welcome">
      <div className="relative mx-auto grid size-20 place-items-center">
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-[1.75rem] bg-primary/40 blur-xl"
          style={{ animation: "flowy-pulse-ring 2.4s ease-out infinite" }}
        />
        <span
          className="relative grid size-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-primary to-indigo-500 text-white"
          style={{
            animation: "flowy-float 3.2s ease-in-out infinite",
            boxShadow: "0 20px 50px -10px hsl(var(--primary) / 0.7)",
          }}
        >
          <Sparkles className="size-9" />
        </span>
      </div>
      <h2 className="mt-6 text-center text-2xl font-bold tracking-tight">
        Oi, {name}! <span className="inline-block origin-[70%_70%] animate-[flowy-bell_1.4s_ease-in-out_2]">👋</span>
      </h2>
      <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">
        Vamos deixar o Flowy com a sua cara. Leva <strong className="text-foreground">1 minuto</strong>.
      </p>
      <ul className="mt-5 space-y-2">
        {perks.map((perk, index) => (
          <li
            key={perk.text}
            className="flex animate-in items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-2.5 text-sm fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${180 + index * 110}ms` }}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              {perk.icon}
            </span>
            {perk.text}
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-2">
        <Button type="button" onClick={onStart} className="h-12 gap-2 text-base">
          Bora começar
          <ArrowRight className="size-4" />
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip} className="text-muted-foreground">
          Já sei usar, pular
        </Button>
      </div>
    </CenteredCard>
  );
}

function ThemeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { theme: currentTheme, setTheme } = useTheme();
  const updatePreferences = useUpdatePreferences();
  const selectedTheme = normalizeThemePreference(currentTheme);

  function chooseTheme(value: ThemePreference) {
    setTheme(value);
    updatePreferences.mutate({ theme: value });
  }

  return (
    <CenteredCard phase="theme">
      <StepHeader phase="theme" label="Seu visual" onSkip={onSkip} />
      <h2 className="mt-3 text-xl font-bold tracking-tight">Qual combina com você?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Toque para ver na hora. Dá para trocar depois.</p>
      <div className="mt-5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Tema">
        {themes.map((option, index) => {
          const selected = selectedTheme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => chooseTheme(option.value)}
              className={cn(
                "group animate-in rounded-2xl border p-2 text-left fade-in zoom-in-95 transition-all duration-300 active:scale-95",
                selected
                  ? "border-primary ring-[3px] ring-primary/25"
                  : "border-border hover:-translate-y-0.5 hover:border-primary/50",
              )}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span
                className="block h-20 overflow-hidden rounded-xl p-2 transition-transform duration-500 group-hover:scale-[1.03]"
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
                {selected ? <Check className="size-4 animate-in text-primary zoom-in" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <Button type="button" onClick={onNext} className="mt-5 h-12 w-full gap-2">
        Continuar
        <ArrowRight className="size-4" />
      </Button>
    </CenteredCard>
  );
}

function OrganizeStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const queryClient = useQueryClient();
  const existingFolders = useFolders().data ?? [];
  const existingTags = useCategories().data ?? [];
  const [profileId, setProfileId] = useState(defaultProfile.id);
  const [pickedFolders, setPickedFolders] = useState<string[]>(defaultProfile.folders);
  const [pickedTags, setPickedTags] = useState<string[]>(defaultProfile.tags);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const newFolders = missingStarterItems(pickedFolders, STARTER_FOLDERS, existingFolders);
  const newTags = missingStarterItems(pickedTags, STARTER_TAGS, existingTags);
  const total = newFolders.length + newTags.length;

  function pickProfile(id: string) {
    const profile = STARTER_PROFILES.find((item) => item.id === id);
    if (!profile) return;
    setProfileId(id);
    setPickedFolders(profile.folders);
    setPickedTags(profile.tags);
  }

  function toggle(list: string[], setList: (next: string[]) => void, value: string) {
    setProfileId("");
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function createKit() {
    if (total === 0) {
      onNext();
      return;
    }
    setBusy(true);
    setFailed(false);
    const results = await createStarterItems(newFolders, newTags);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: folderKeys.all }),
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
    ]);
    setBusy(false);
    if (results.every((result) => result.status === "rejected")) {
      setFailed(true);
      return;
    }
    onNext();
  }

  const has = (items: { name: string }[], name: string) =>
    items.some((item) => normalize(item.name) === normalize(name));

  return (
    <CenteredCard phase="organize" wide>
      <StepHeader phase="organize" label="Organização" onSkip={onSkip} />
      <h2 className="mt-3 text-xl font-bold tracking-tight">Pastas e etiquetas em 10 segundos</h2>

      <FolderTagDemo />

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs leading-5">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <Folder className="size-3.5 text-primary" /> Pasta
          </p>
          <p className="mt-0.5 text-muted-foreground">
            <strong className="text-foreground">Onde</strong> a tarefa mora. Uma por tarefa.
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <Tag className="size-3.5 text-primary" /> Etiqueta
          </p>
          <p className="mt-0.5 text-muted-foreground">
            <strong className="text-foreground">Como</strong> ela é. Pode ter várias.
          </p>
        </div>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Você usa o Flowy para…
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {STARTER_PROFILES.map((profile) => (
          <button
            key={profile.id}
            type="button"
            onClick={() => pickProfile(profile.id)}
            aria-pressed={profileId === profile.id}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-300 active:scale-95",
              profileId === profile.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/40 hover:border-primary/50",
            )}
          >
            <span className="mr-1.5">{profile.emoji}</span>
            {profile.label}
          </button>
        ))}
      </div>

      <PickerGroup
        title="Pastas"
        icon={<Folder className="size-3.5" />}
        items={STARTER_FOLDERS}
        picked={pickedFolders}
        existing={(item) => has(existingFolders, item.name)}
        onToggle={(value) => toggle(pickedFolders, setPickedFolders, value)}
        layout="grid"
      />
      <PickerGroup
        title="Etiquetas"
        icon={<Tag className="size-3.5" />}
        items={STARTER_TAGS}
        picked={pickedTags}
        existing={(item) => has(existingTags, item.name)}
        onToggle={(value) => toggle(pickedTags, setPickedTags, value)}
        layout="pills"
      />

      {failed ? (
        <p className="mt-3 text-xs text-destructive">
          Não foi possível criar agora. Verifique sua conexão e tente de novo.
        </p>
      ) : null}

      <div className="sticky -bottom-5 -mx-5 mt-5 bg-gradient-to-t from-card via-card/95 to-transparent px-5 pb-1 pt-3">
        <Button type="button" onClick={createKit} loading={busy} className="h-12 w-full gap-2">
          {total > 0 ? (
            <>
              <Check className="size-4" />
              Criar {describeCount(newFolders.length, "pasta", "pastas")}
              {newFolders.length && newTags.length ? " e " : ""}
              {describeCount(newTags.length, "etiqueta", "etiquetas")}
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </CenteredCard>
  );
}

function createStarterItems(folders: StarterItem[], tags: StarterItem[]) {
  const base = Date.now();
  return Promise.allSettled([
    ...folders.map((item, index) =>
      createFolder({ name: item.name, color: item.color, position: base + index }),
    ),
    ...tags.map((item, index) =>
      createCategory({ name: item.name, color: item.color, position: base + index }),
    ),
  ]);
}

function describeCount(count: number, singular: string, plural: string) {
  if (!count) return "";
  return `${count} ${count === 1 ? singular : plural}`;
}

function PickerGroup({
  title,
  icon,
  items,
  picked,
  existing,
  onToggle,
  layout,
}: {
  title: string;
  icon: ReactNode;
  items: StarterItem[];
  picked: string[];
  existing: (item: StarterItem) => boolean;
  onToggle: (name: string) => void;
  layout: "grid" | "pills";
}) {
  return (
    <fieldset className="mt-4">
      <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}
        {title}
      </legend>
      <div className={cn("mt-2", layout === "grid" ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "flex flex-wrap gap-2")}>
        {items.map((item, index) => {
          const already = existing(item);
          const selected = already || picked.includes(item.name);
          const style = {
            animationDelay: `${index * 45}ms`,
            "--chip": item.color,
          } as CSSProperties;
          return layout === "grid" ? (
            <button
              key={item.name}
              type="button"
              disabled={already}
              aria-pressed={selected}
              aria-label={already ? `${item.name} (você já tem)` : item.name}
              onClick={() => onToggle(item.name)}
              style={style}
              className={cn(
                "relative animate-in rounded-2xl border p-2.5 text-left fade-in zoom-in-95 transition-all duration-300 active:scale-95 disabled:cursor-default",
                selected
                  ? "border-[var(--chip)] bg-[color-mix(in_srgb,var(--chip)_14%,transparent)]"
                  : "border-border bg-background/40 hover:border-[var(--chip)]",
              )}
            >
              <span className="flex items-center justify-between">
                <span className="text-lg leading-none">{item.emoji}</span>
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border transition-all duration-300",
                    selected ? "scale-100 border-transparent bg-[var(--chip)] text-black" : "scale-90 border-border",
                  )}
                >
                  {selected ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
              </span>
              <span className="mt-1.5 block text-sm font-semibold">{item.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {already ? "Você já tem" : item.hint}
              </span>
            </button>
          ) : (
            <button
              key={item.name}
              type="button"
              disabled={already}
              aria-pressed={selected}
              aria-label={already ? `${item.name} (você já tem)` : item.name}
              onClick={() => onToggle(item.name)}
              style={style}
              title={item.hint}
              className={cn(
                "flex animate-in items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm fade-in zoom-in-95 transition-all duration-300 active:scale-95 disabled:cursor-default",
                selected
                  ? "border-[var(--chip)] bg-[color-mix(in_srgb,var(--chip)_18%,transparent)] font-medium"
                  : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <span>{item.emoji}</span>
              {item.name}
              {selected ? <Check className="size-3.5 animate-in zoom-in" /> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Loops: a task appears, gets a label and drops into its folder. */
function FolderTagDemo() {
  const loop = "4.2s cubic-bezier(0.16, 1, 0.3, 1) infinite";
  return (
    <div
      aria-hidden="true"
      className="relative mt-4 h-32 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-primary/10 to-transparent"
    >
      <div
        className="absolute left-1/2 top-4 flex w-52 items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs"
        style={{ animation: `flowy-demo-card ${loop}` }}
      >
        <span className="size-3.5 shrink-0 rounded-full border-2 border-muted-foreground/50" />
        <span className="flex-1 truncate font-medium">Enviar proposta</span>
        <span
          className="rounded-full bg-[#F87171]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#F87171]"
          style={{ animation: `flowy-demo-tag ${loop}` }}
        >
          🔥 Urgente
        </span>
      </div>
      <div
        className="absolute bottom-3 left-1/2 -ml-12 flex w-24 flex-col items-center"
        style={{ animation: `flowy-demo-folder ${loop}` }}
      >
        <span className="grid size-11 place-items-center rounded-xl bg-[#6366F1]/20 text-[#818CF8]">
          <Folder className="size-6" fill="currentColor" fillOpacity={0.25} />
        </span>
        <span className="mt-1 text-[11px] font-semibold">Trabalho</span>
      </div>
    </div>
  );
}

function TaskStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const folders = useFolders().data ?? [];
  const categories = useCategories().data ?? [];
  const createTask = useCreateTask();
  const [title, setTitle] = useState("Reunião com cliente amanhã 15h");
  const [manualFolder, setManualFolder] = useState<string | null | undefined>(undefined);
  const [manualTags, setManualTags] = useState<string[] | undefined>(undefined);

  const smart = title.trim() ? suggestOrganization(title, { folders, categories }) : null;
  const parsed = parseQuickTask(smart?.title || title);
  const folderId = manualFolder === undefined ? (smart?.folderId ?? null) : manualFolder;
  const tagIds = manualTags ?? smart?.categoryIds ?? [];
  const when = parsed.due_date
    ? `${formatTaskDate(parsed.due_date)}${parsed.due_time ? ` às ${parsed.due_time}` : ""}`
    : "Hoje";

  function submit() {
    if (!parsed.title.trim()) return;
    createTask.mutate(
      {
        title: parsed.title,
        due_date: parsed.due_date ?? localDateKey(new Date()),
        due_time: parsed.due_time,
        folder_id: folderId,
        category_ids: tagIds,
      },
      { onSuccess: onNext },
    );
  }

  return (
    <CenteredCard phase="task" wide>
      <StepHeader phase="task" label="Primeira tarefa" onSkip={onSkip} />
      <h2 className="mt-3 text-xl font-bold tracking-tight">Escreva como você fala</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        O Flowy entende a data e sugere pasta e etiqueta sozinho.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          maxLength={200}
          aria-label="Título da tarefa"
          className="h-12 text-base"
        />
        <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-live="polite">
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 font-medium text-primary">
            <CalendarDays className="size-3.5" /> {when}
          </span>
          {parsed.title && parsed.title !== title.trim() ? (
            <span className="truncate text-muted-foreground">→ “{parsed.title}”</span>
          ) : null}
        </div>

        {folders.length ? (
          <ChipRow label="Pasta" icon={<Folder className="size-3.5" />}>
            {folders.slice(0, 6).map((folder) => {
              const active = folderId === folder.id;
              return (
                <Chip
                  key={folder.id}
                  color={folder.color}
                  active={active}
                  onClick={() => setManualFolder(active ? null : folder.id)}
                >
                  {folder.name}
                </Chip>
              );
            })}
          </ChipRow>
        ) : null}
        {categories.length ? (
          <ChipRow label="Etiquetas" icon={<Tag className="size-3.5" />}>
            {categories.slice(0, 8).map((category) => {
              const active = tagIds.includes(category.id);
              return (
                <Chip
                  key={category.id}
                  color={category.color}
                  active={active}
                  onClick={() =>
                    setManualTags(active ? tagIds.filter((id) => id !== category.id) : [...tagIds, category.id])
                  }
                >
                  {category.name}
                </Chip>
              );
            })}
          </ChipRow>
        ) : null}

        <p className="flex items-start gap-2 rounded-2xl border border-dashed border-border/80 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <Hash className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>
            Atalho: <code className="rounded bg-muted px-1 text-foreground">#urgente</code> põe etiqueta e{" "}
            <code className="rounded bg-muted px-1 text-foreground">/trabalho</code> escolhe a pasta.
          </span>
        </p>

        {createTask.isError ? (
          <p className="text-xs text-destructive">
            Não foi possível criar a tarefa. Verifique sua conexão e tente de novo.
          </p>
        ) : null}
        <Button
          type="submit"
          className="h-12 w-full gap-2"
          loading={createTask.isPending}
          disabled={!parsed.title.trim()}
        >
          <Check className="size-4" />
          Criar tarefa
        </Button>
      </form>
    </CenteredCard>
  );
}

function ChipRow({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 flex w-20 shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  color,
  active,
  onClick,
  children,
}: {
  color: string | null;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const tint = color ?? "#8B5CF6";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-300 active:scale-95",
        active ? "scale-105" : "border-border text-muted-foreground hover:text-foreground",
      )}
      style={active ? { borderColor: tint, backgroundColor: `${tint}26`, color: "inherit" } : undefined}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: tint }} />
      {children}
    </button>
  );
}

const confetti = Array.from({ length: 28 }, (_, index) => {
  const angle = (index / 28) * Math.PI * 2;
  const distance = 110 + (index % 4) * 30;
  return {
    color: ["#8B5CF6", "#38BDF8", "#4ADE80", "#FACC15", "#F472B6", "#FB923C"][index % 6],
    style: {
      "--dx": `${Math.round(Math.cos(angle) * distance)}px`,
      "--dy": `${Math.round(Math.sin(angle) * distance + 40)}px`,
      "--rot": `${(index % 2 ? 1 : -1) * (180 + index * 25)}deg`,
      animation: `flowy-confetti 1.3s cubic-bezier(0.16, 1, 0.3, 1) ${(index % 5) * 40}ms both`,
    } as CSSProperties,
    round: index % 3 === 0,
  };
});

function DoneStep({ onFinish }: { onFinish: () => void }) {
  const tips = [
    { icon: <Wand2 className="size-4" />, text: "“Pagar conta sexta 10h” + Enter cria com data" },
    { icon: <Hash className="size-4" />, text: "#etiqueta e /pasta organizam enquanto você digita" },
    { icon: <Check className="size-4" />, text: "Toque no círculo da tarefa para concluir" },
  ];
  return (
    <CenteredCard phase="done">
      <div className="relative mx-auto grid size-20 place-items-center">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
          {confetti.map((piece, index) => (
            <span
              key={index}
              className={cn("absolute block", piece.round ? "size-2 rounded-full" : "h-3 w-1.5 rounded-sm")}
              style={{ ...piece.style, backgroundColor: piece.color }}
            />
          ))}
        </div>
        <span className="grid size-20 animate-in place-items-center rounded-[1.75rem] bg-success/15 text-4xl zoom-in">
          🎉
        </span>
      </div>
      <h2 className="mt-5 text-center text-2xl font-bold tracking-tight">Tudo pronto!</h2>
      <p className="mt-1.5 text-center text-sm text-muted-foreground">3 truques para usar todo dia:</p>
      <ul className="mt-4 space-y-2">
        {tips.map((tip, index) => (
          <li
            key={tip.text}
            className="flex animate-in items-center gap-3 rounded-2xl border border-border/60 bg-background/40 px-3 py-2.5 text-sm fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${300 + index * 110}ms` }}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              {tip.icon}
            </span>
            {tip.text}
          </li>
        ))}
      </ul>
      <Button type="button" onClick={onFinish} className="mt-6 h-12 w-full gap-2 text-base">
        Começar a usar
        <ArrowRight className="size-4" />
      </Button>
    </CenteredCard>
  );
}

function StepHeader({ phase, label, onSkip }: { phase: Phase; label: string; onSkip: () => void }) {
  const current = progressPhases.indexOf(phase);
  return (
    <div>
      <div className="flex gap-1.5" aria-hidden="true">
        {progressPhases.map((item, index) => (
          <span key={item} className="h-1 flex-1 overflow-hidden rounded-full bg-muted-foreground/20">
            <span
              className="block h-full rounded-full bg-primary transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `scaleX(${index <= current ? 1 : 0})`, transformOrigin: "left" }}
            />
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          {current + 1}/{progressPhases.length} · {label}
        </span>
        <SkipButton onClick={onSkip} />
      </div>
    </div>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            index === active ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

function TourCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flowy-glass flowy-glass-strong rounded-3xl border p-5 text-card-foreground [--glass-alpha:0.93]", className)}>
      {children}
    </div>
  );
}

function CenteredCard({ children, phase, wide = false }: { children: ReactNode; phase: Phase; wide?: boolean }) {
  return (
    <div
      key={phase}
      className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-in fade-in zoom-in-95 slide-in-from-bottom-4",
        wide ? "w-[min(94vw,480px)]" : "w-[min(92vw,420px)]",
      )}
    >
      <TourCard className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain">{children}</TourCard>
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
