"use client";

import { AppVersion } from "@/features/settings/app-version";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  Dumbbell,
  GraduationCap,
  Home,
  KeyRound,
  LayoutGrid,
  LifeBuoy,
  ListTodo,
  Loader2,
  LogOut,
  MessageSquareHeart,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "@/lib/toast";
import { notify } from "@/providers/notification-provider";

import {
  useChangePassword,
  useCurrentUser,
  usePreferences,
  useProfile,
  useUpdatePreferences,
  useUpdateProfile,
  useUploadAvatar,
} from "@/features/settings/use-settings";
import { optimizeImage } from "@/lib/image-optimizer";
import { DeleteAccountButton } from "@/components/auth/delete-account-button";
import { SwitchRow } from "@/components/ui/switch-row";
import { PushNotificationsSection } from "@/features/settings/push-notifications-section";
import { CalendarFeedSection } from "@/features/settings/calendar-feed-section";
import { cn } from "@/lib/utils";
import { markStartViewChosen } from "@/features/tasks/start-view-picker";
import { BroadcastSection } from "@/features/announcements/announcements";
import { DockSection } from "@/features/settings/dock-section";
import {
  FeedbackForm,
  FeedbackInbox,
} from "@/features/settings/feedback-section";
import { normalizeThemePreference } from "@/lib/theme";
import { clearTaskCache } from "@/features/tasks/task-cache";
import { createClient } from "@/lib/supabase/client";
import type { ThemePreference } from "@/types/content";

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "purple", label: "Roxo" },
  { value: "black", label: "Preto" },
  { value: "oled", label: "OLED" },
  { value: "white", label: "Branco" },
];

const THEME_LOOK: Record<
  ThemePreference,
  { bg: string; side: string; line: string; accent: string }
> = {
  purple: {
    bg: "#120a24",
    side: "#1c1236",
    line: "#2c2050",
    accent: "#8b5cf6",
  },
  black: { bg: "#141414", side: "#1c1c1c", line: "#2a2a2a", accent: "#fafafa" },
  oled: { bg: "#000000", side: "#0a0a0a", line: "#1f1f1f", accent: "#fafafa" },
  white: { bg: "#ffffff", side: "#f1f1f4", line: "#e2e2e8", accent: "#7c3aed" },
};

/** A tiny screen in the theme's colours: sidebar, two task lines and the accent. */
function ThemePreview({ theme }: { theme: ThemePreference }) {
  const look = THEME_LOOK[theme];
  return (
    <span
      className="flex h-16 overflow-hidden rounded-xl border border-black/20"
      style={{ backgroundColor: look.bg }}
      aria-hidden="true"
    >
      <span className="w-1/4" style={{ backgroundColor: look.side }} />
      <span className="flex flex-1 flex-col justify-center gap-1.5 px-2">
        <span
          className="h-1.5 w-3/4 rounded-full"
          style={{ backgroundColor: look.line }}
        />
        <span
          className="h-1.5 w-1/2 rounded-full"
          style={{ backgroundColor: look.line }}
        />
        <span
          className="h-2.5 w-8 rounded-full"
          style={{ backgroundColor: look.accent }}
        />
      </span>
    </span>
  );
}

const START_VIEWS = [
  {
    value: "today",
    label: "Hoje",
    icon: Sun,
    hint: "Recomendado: as tarefas de hoje e as que ficaram atrasadas.",
  },
  {
    value: "upcoming",
    label: "Próximas",
    icon: CalendarClock,
    hint: "O que vem nos próximos dias, a partir de amanhã.",
  },
  {
    value: "calendar",
    label: "Calendário",
    icon: CalendarDays,
    hint: "O mês com as tarefas, os feriados e a sua agenda.",
  },
  {
    value: "all",
    label: "Todas",
    icon: ListTodo,
    hint: "Todas as tarefas abertas, de qualquer data ou sem data.",
  },
] as const;

const NAV = [
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "inicio", label: "Início", icon: Home },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "agenda-grupo", label: "Agenda", icon: CalendarDays },
  { id: "modulos", label: "Módulos", icon: LayoutGrid },
  { id: "feedback", label: "Feedback", icon: MessageSquareHeart },
  { id: "ajuda", label: "Ajuda", icon: LifeBuoy },
  { id: "conta", label: "Conta", icon: ShieldCheck },
] as const;

/** Which group is on screen, for the navigation to follow. */
function useActiveGroup() {
  const [active, setActive] = useState<string>(NAV[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-25% 0px -60% 0px" },
    );
    NAV.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);
  return active;
}

/** Chips across the top on phones, a list on the side on wide screens. */
function SettingsNav({ active }: { active: string }) {
  const go = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <nav
      aria-label="Seções das configurações"
      className="sticky top-14 z-20 -mx-4 bg-background/85 px-4 py-2 backdrop-blur lg:top-6 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
    >
      <ul className="flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-0.5">
        {NAV.map(({ id, label, icon: Icon }) => (
          <li key={id} className="shrink-0">
            <button
              type="button"
              onClick={() => go(id)}
              aria-current={active === id ? "true" : undefined}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors lg:w-full lg:rounded-xl",
                active === id
                  ? "bg-primary/15 text-foreground lg:bg-primary/10"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-4", active === id && "flowy-ink")}
                aria-hidden="true"
              />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One group of settings: a card with a coloured icon, a title and a line of explanation. */
function Group({
  id,
  icon: Icon,
  tone,
  title,
  description,
  bare,
  children,
}: {
  id: string;
  icon: LucideIcon;
  tone: string;
  title: string;
  description: string;
  /** The content brings its own heading. */
  bare?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="scroll-mt-32 rounded-[1.75rem] border border-border/60 bg-card/40 p-4 sm:p-6 lg:scroll-mt-8"
    >
      {bare ? null : (
        <header className="mb-4 flex items-center gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl text-white shadow-lg",
              tone,
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {description}
            </p>
          </span>
        </header>
      )}
      {children}
    </section>
  );
}

function RowLink({
  href,
  icon: Icon,
  title,
  description,
  compact,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border/60 p-3.5 transition-colors hover:bg-muted/30",
        !compact && "mt-2",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRight
        className="size-4 text-muted-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}

export function SettingsPage() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const client = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const profile = useProfile();
  const preferences = usePreferences();
  const currentUser = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();
  const uploadAvatar = useUploadAvatar();
  const passwordMutation = useChangePassword();
  const [draftName, setDraftName] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const savedTheme = normalizeThemePreference(preferences.data?.theme);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>("purple");
  const [reduceMotion, setReduceMotion] = useState(false);

  const name = draftName ?? profile.data?.display_name ?? "";
  const active = useActiveGroup();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTheme(savedTheme);
  }, [savedTheme]);

  useEffect(() => {
    const enabled =
      window.localStorage.getItem("flowy:reduce-motion") === "true";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduceMotion(enabled);
    document.documentElement.classList.toggle("reduce-motion", enabled);
  }, []);

  function toggleReduceMotion() {
    const next = !reduceMotion;
    setReduceMotion(next);
    window.localStorage.setItem("flowy:reduce-motion", String(next));
    document.documentElement.classList.toggle("reduce-motion", next);
    notify(next ? "Animações reduzidas" : "Animações ativadas");
  }

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.length > 50) {
      toast.error("O nome não pode ter mais de 50 caracteres.");
      return;
    }
    if (!/^[^\s]+\s+[^\s]+$/.test(trimmed)) {
      toast.error("Informe apenas nome e sobrenome (duas palavras).");
      return;
    }
    try {
      await updateProfile.mutateAsync({ display_name: trimmed });
      setDraftName(null);
      notify("Perfil salvo");
    } catch {
      toast.error("Não foi possível salvar o perfil.");
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Escolha um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB antes da otimização.");
      return;
    }

    notify("Enviando foto…", { tone: "info" });
    try {
      // Shown at most ~80px (160px on retina): 192px at 70% stays ~10-25 KB.
      const optimizedFile = await optimizeImage(file, 192, 192, 0.7);
      await uploadAvatar.mutateAsync(optimizedFile);
      notify("Foto atualizada");
    } catch {
      toast.error("Não foi possível enviar a foto.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Use pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    try {
      await passwordMutation.mutateAsync(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      notify("Senha alterada");
    } catch {
      toast.error("Não foi possível alterar a senha.");
    }
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) {
      toast.error("Não foi possível sair.");
      return;
    }
    clearTaskCache();
    router.replace("/login");
    router.refresh();
  }

  async function changeTheme(nextTheme: ThemePreference) {
    if (nextTheme === selectedTheme || updatePreferences.isPending) return;

    const previousTheme = selectedTheme;
    setSelectedTheme(nextTheme);
    setTheme(nextTheme);

    try {
      await updatePreferences.mutateAsync({ theme: nextTheme });
      notify("Tema atualizado");
    } catch {
      setSelectedTheme(previousTheme);
      setTheme(previousTheme);
      toast.error("Não foi possível salvar o tema.");
    }
  }

  if (profile.isLoading || preferences.isLoading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Carregando configurações</span>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
      <header className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sua conta e o Flowy do seu jeito.
        </p>
      </header>

      {/* Profile: the person first, editable right here. */}
      <section
        aria-label="Perfil"
        className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-gradient-to-br from-primary/[0.14] via-card/70 to-card/40 p-5 sm:p-6"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-violet-500/20 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploadAvatar.isPending}
              aria-label="Alterar foto"
              className="group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-2xl font-semibold text-muted-foreground ring-4 ring-background/60"
            >
              {profile.data?.avatar_url ? (
                <Image
                  src={profile.data.avatar_url}
                  alt="Foto do perfil"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                (profile.data?.display_name || currentUser.data?.email || "F")
                  .slice(0, 1)
                  .toUpperCase()
              )}
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {uploadAvatar.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Camera className="size-5" />
                )}
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleAvatar(event.target.files?.[0])}
            />
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">
                {profile.data?.display_name || "Seu nome"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {currentUser.data?.email}
              </p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium flowy-ink hover:underline"
              >
                <Camera className="size-3.5" /> Trocar foto
              </button>
            </div>
          </div>
          <form
            onSubmit={saveName}
            className="flex w-full gap-2 sm:ml-auto sm:max-w-xs"
          >
            <label htmlFor="profile-name" className="sr-only">
              Nome e sobrenome
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Nome e sobrenome"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-border/70 bg-background/60 px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
              autoComplete="name"
              maxLength={50}
            />
            <button
              disabled={
                !name.trim() ||
                name.trim() === profile.data?.display_name ||
                updateProfile.isPending
              }
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {updateProfile.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Salvar
            </button>
          </form>
        </div>
      </section>

      <div className="mt-6 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8">
        <SettingsNav active={active} />

        <div className="mt-4 space-y-5 lg:mt-0">
          <BroadcastSection />
          <FeedbackInbox />

          <Group
            id="aparencia"
            icon={Palette}
            tone="bg-fuchsia-500"
            title="Aparência"
            description="Tema e animações."
          >
            <div
              className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
              role="group"
              aria-label="Escolher tema"
            >
              {themeOptions.map((option) => {
                const selected = selectedTheme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => changeTheme(option.value)}
                    disabled={updatePreferences.isPending}
                    aria-pressed={selected}
                    className={cn(
                      "group rounded-2xl border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
                      selected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/60 hover:border-border",
                    )}
                  >
                    <ThemePreview theme={option.value} />
                    <span className="mt-2 flex items-center justify-between px-1 text-sm font-semibold">
                      {option.label}
                      {selected ? (
                        <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" aria-hidden="true" />
                          <span className="sr-only">Selecionado</span>
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <SwitchRow
              icon={<Sparkles className="size-5" />}
              title="Reduzir animações"
              description="Deixa transições e efeitos visuais mais simples."
              checked={reduceMotion}
              onToggle={toggleReduceMotion}
            />
          </Group>

          <Group
            id="inicio"
            icon={Home}
            tone="bg-sky-500"
            title="Início e atalhos"
            description="O que aparece primeiro e a barra de baixo do celular."
          >
            <p className="text-sm font-medium">Ao abrir o Flowy, mostrar</p>
            <div
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="radiogroup"
              aria-label="Ao abrir o Flowy, mostrar"
            >
              {START_VIEWS.map((option) => {
                const checked =
                  (preferences.data?.default_task_view ?? "today") ===
                  option.value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => {
                      markStartViewChosen();
                      updatePreferences.mutate({
                        default_task_view: option.value,
                      });
                    }}
                    className={cn(
                      "flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all",
                      checked
                        ? "border-primary/60 bg-primary/[0.1]"
                        : "border-border/60 hover:bg-muted/30",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 place-items-center rounded-xl",
                        checked
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="text-sm font-semibold">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {
                START_VIEWS.find(
                  (option) =>
                    option.value ===
                    (preferences.data?.default_task_view ?? "today"),
                )?.hint
              }
            </p>
            <div className="mt-6 md:mt-0">
              <DockSection />
            </div>
          </Group>

          <Group
            id="notificacoes"
            icon={Bell}
            tone="bg-amber-500"
            title="Notificações"
            description="Lembretes no horário das tarefas, mesmo com o Flowy fechado."
            bare
          >
            <PushNotificationsSection />
          </Group>

          <Group
            id="agenda-grupo"
            icon={CalendarDays}
            tone="bg-emerald-500"
            title="Agenda"
            description="Google Agenda, Google Tarefas e outras agendas."
            bare
          >
            <CalendarFeedSection />
          </Group>

          <Group
            id="feedback"
            icon={MessageSquareHeart}
            tone="bg-pink-500"
            title="Feedback"
            description="Achou um problema ou teve uma ideia? Conta pra gente."
          >
            <FeedbackForm />
          </Group>

          <Group
            id="modulos"
            icon={LayoutGrid}
            tone="bg-violet-500"
            title="Módulos"
            description="Ligue só o que faz sentido para você."
          >
            <SwitchRow
              icon={<Dumbbell className="size-5" />}
              title="Treinos"
              description="Plano de treino, séries, progresso e mapa muscular. Aparece no menu e no Hoje."
              checked={preferences.data?.workouts_enabled === true}
              disabled={!preferences.data || updatePreferences.isPending}
              onToggle={() =>
                updatePreferences.mutate({
                  workouts_enabled: !preferences.data?.workouts_enabled,
                })
              }
            />
            <RowLink
              href="/app/classes"
              icon={GraduationCap}
              title="Grade de aulas"
              description="Suas aulas fixas da semana. No Hoje aparece a de agora e a próxima."
            />
          </Group>

          <Group
            id="ajuda"
            icon={LifeBuoy}
            tone="bg-teal-500"
            title="Ajuda"
            description="Tutorial e como instalar o app."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/app?tour=1")}
                className="flex items-center gap-3 rounded-2xl border border-border/60 p-3.5 text-left transition-colors hover:bg-muted/30"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-teal-500/15 text-teal-400">
                  <Sparkles className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    Rever o tutorial
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    O passo a passo do começo
                  </span>
                </span>
              </button>
              <RowLink
                href="/instalar"
                icon={Smartphone}
                title="Instalar o app"
                description="No celular ou no computador"
                compact
              />
            </div>
          </Group>

          <Group
            id="conta"
            icon={ShieldCheck}
            tone="bg-rose-500"
            title="Conta e segurança"
            description={currentUser.data?.email ?? ""}
          >
            <details className="group rounded-2xl border border-border/60 open:bg-muted/20">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
                <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <KeyRound className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">
                    Alterar senha
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Pelo menos 8 caracteres
                  </span>
                </span>
                <ChevronRight
                  className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <form onSubmit={updatePassword} className="space-y-3 px-3.5 pb-4">
                <label
                  className="block text-sm font-medium"
                  htmlFor="new-password"
                >
                  Nova senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className="min-h-11 w-full rounded-xl border border-border/70 bg-background/60 px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                />
                <label
                  className="block text-sm font-medium"
                  htmlFor="confirm-password"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className="min-h-11 w-full rounded-xl border border-border/70 bg-background/60 px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
                />
                <button
                  disabled={passwordMutation.isPending || !newPassword}
                  className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Alterar senha
                </button>
              </form>
            </details>

            <button
              type="button"
              onClick={signOut}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-border/60 p-3.5 text-left transition-colors hover:bg-muted/30"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <LogOut className="size-5" />
              </span>
              <span className="text-sm font-semibold">Sair da conta</span>
            </button>

            <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/[0.05] p-3.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-destructive">
                Zona de cuidado
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Excluir a conta apaga tudo e não dá para desfazer.
              </p>
              <div className="mt-2">
                <DeleteAccountButton showLabel />
              </div>
            </div>
          </Group>

          <AppVersion />
        </div>
      </div>
    </div>
  );
}
