"use client";

import { Check, ChevronRight, Dumbbell, Flame, Minus, Moon, Pencil, Power, Settings2, SkipForward, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdatePreferences } from "@/features/settings/use-settings";
import { localDateKey } from "@/features/tasks/date-utils";
import { cn } from "@/lib/utils";

import { WorkoutEditor } from "./components/workout-editor";
import { WorkoutQuestionnaire } from "./components/questionnaire";
import { WorkoutSession } from "./components/workout-session";
import {
  buildSession,
  currentStreak,
  dayStatus,
  monthDays,
  sessionKeyFor,
  sessionKeys,
  weekDays,
  type DayStatus,
} from "./plan";
import { GOAL_LABELS, PLACE_LABELS, type WorkoutLog, type WorkoutProfile } from "./types";
import { useWorkoutLogs, useWorkoutProfile, useWorkoutsEnabled } from "./use-workouts";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAY_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function parseDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year!, month! - 1, date!);
}

const STATUS_STYLE: Record<DayStatus, { label: string; className: string; icon?: typeof Check }> = {
  done: { label: "Treinou", className: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30", icon: Check },
  skipped: { label: "Pulou", className: "bg-muted text-muted-foreground", icon: SkipForward },
  missed: { label: "Não treinou", className: "bg-destructive/15 text-destructive ring-destructive/25", icon: X },
  rest: { label: "Descanso", className: "text-muted-foreground/60", icon: Minus },
  today: { label: "Hoje", className: "ring-2 ring-violet-400 text-foreground" },
  planned: { label: "Treino previsto", className: "bg-violet-500/10 text-foreground" },
  before: { label: "", className: "text-muted-foreground/40" },
};

function EnableCard() {
  const update = useUpdatePreferences();
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-border/60 bg-card/50 p-6 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl flowy-active">
        <Dumbbell className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Acompanhe seus treinos no Flowy</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Um plano montado para você, os dias em que treinou e a explicação de cada exercício. Dá para desligar quando
        quiser em Configurações.
      </p>
      <Button
        type="button"
        className="mt-5 h-11"
        loading={update.isPending}
        onClick={() => update.mutate({ workouts_enabled: true })}
      >
        Ativar treinos
      </Button>
    </section>
  );
}

function WeekStrip({ profile, logs, today }: { profile: WorkoutProfile; logs: Map<string, WorkoutLog>; today: string }) {
  return (
    <div className="grid grid-cols-7 gap-1.5" role="list" aria-label="Esta semana">
      {weekDays(today).map((day) => {
        const status = dayStatus(profile, logs, day, today);
        const style = STATUS_STYLE[status];
        const Icon = style.icon;
        const date = parseDay(day);
        return (
          <div
            key={day}
            role="listitem"
            aria-label={`${WEEKDAY_LONG[date.getDay()]} ${date.getDate()}: ${style.label || "sem plano"}`}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/40 bg-card/40 py-2.5"
          >
            <span className="text-[11px] font-medium uppercase text-muted-foreground">{WEEKDAY_SHORT[date.getDay()]}</span>
            <span className={cn("grid size-9 place-items-center rounded-full text-sm font-semibold ring-1 ring-transparent", style.className)}>
              {Icon ? <Icon className="size-4" aria-hidden="true" /> : date.getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ profile, logs, today }: { profile: WorkoutProfile; logs: Map<string, WorkoutLog>; today: string }) {
  const days = monthDays(today);
  const leading = (parseDay(days[0]!).getDay() + 6) % 7;
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(parseDay(today));
  const legend: DayStatus[] = ["done", "missed", "skipped", "planned"];
  return (
    <section className="rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6" aria-label="Mês">
      <h2 className="font-semibold first-letter:uppercase">{monthName}</h2>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((letter, index) => (
          <span key={index}>{letter}</span>
        ))}
        {Array.from({ length: leading }, (_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {days.map((day) => {
          const status = dayStatus(profile, logs, day, today);
          return (
            <span
              key={day}
              title={STATUS_STYLE[status].label}
              className={cn(
                "mx-auto grid size-8 place-items-center rounded-full text-xs ring-1 ring-transparent",
                STATUS_STYLE[status].className,
              )}
            >
              {parseDay(day).getDate()}
            </span>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted-foreground sm:flex sm:flex-wrap sm:gap-4">
        {legend.map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("size-3 shrink-0 rounded-full ring-1 ring-transparent", STATUS_STYLE[status].className)} />
            {STATUS_STYLE[status].label}
          </span>
        ))}
      </div>
    </section>
  );
}

function nextTraining(profile: WorkoutProfile, today: string) {
  const cursor = parseDay(today);
  for (let step = 1; step <= 7; step += 1) {
    cursor.setDate(cursor.getDate() + 1);
    const day = localDateKey(cursor);
    const key = sessionKeyFor(profile, day);
    if (key) return { day, session: buildSession(profile, key), weekday: WEEKDAY_LONG[cursor.getDay()]! };
  }
  return null;
}

/** Each workout of the week once, with the weekdays it falls on. */
function WeekPlans({ profile, onEdit }: { profile: WorkoutProfile; onEdit: (key: string) => void }) {
  const keys = sessionKeys(profile);
  const days = [...new Set(profile.days)].sort((a, b) => a - b);
  const byKey = new Map<string, number[]>();
  days.forEach((weekday, index) => {
    const key = keys[index % keys.length]!;
    byKey.set(key, [...(byKey.get(key) ?? []), weekday]);
  });
  return (
    <section className="rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6" aria-label="Seus treinos">
      <h2 className="font-semibold">Seus treinos</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Toque num treino para tirar, trocar ou adicionar exercícios.</p>
      <ul className="mt-3 space-y-2">
        {[...byKey].map(([key, weekdays]) => {
          const session = buildSession(profile, key);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onEdit(key)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-background/40 p-3 text-left transition-colors hover:border-violet-400/50 hover:bg-violet-500/5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/15 flowy-ink">
                  <Pencil className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-snug">{session.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {weekdays.map((weekday) => WEEKDAY_SHORT[weekday]).join(", ")} · {session.exercises.length} exercícios
                    {session.custom ? " · editado por você" : ""}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Dashboard({ profile, logs }: { profile: WorkoutProfile; logs: WorkoutLog[] }) {
  const [editing, setEditing] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const update = useUpdatePreferences();
  const today = localDateKey();
  const byDay = useMemo(() => new Map(logs.map((log) => [log.day, log])), [logs]);
  const todayKey = sessionKeyFor(profile, today);
  const next = todayKey ? null : nextTraining(profile, today);
  const streak = currentStreak(profile, byDay, today);
  const month = today.slice(0, 7);
  const doneThisMonth = logs.filter((log) => log.status === "done" && log.day.startsWith(month)).length;

  if (editing) {
    return <WorkoutQuestionnaire initial={profile} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  }

  if (editingKey) {
    return (
      <WorkoutEditor
        key={editingKey}
        session={buildSession(profile, editingKey)}
        profile={profile}
        onClose={() => setEditingKey(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1.5 text-sm font-semibold text-orange-400">
          <Flame className="size-4" aria-hidden="true" />
          {streak} {streak === 1 ? "treino seguido" : "treinos seguidos"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-400">
          <Check className="size-4" aria-hidden="true" />
          {doneThisMonth} este mês
        </span>
      </div>

      <WeekStrip profile={profile} logs={byDay} today={today} />

      {todayKey ? (
        <WorkoutSession
          session={buildSession(profile, todayKey)}
          profile={profile}
          day={today}
          log={byDay.get(today)}
          onEdit={() => setEditingKey(todayKey)}
        />
      ) : (
        <section className="rounded-3xl border border-border/60 bg-card/50 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Moon className="size-4 flowy-ink" aria-hidden="true" />
            Hoje é dia de descanso
          </p>
          {next ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Próximo treino: <span className="font-medium text-foreground">{next.session.name}</span>, na {next.weekday}.
            </p>
          ) : null}
        </section>
      )}

      <WeekPlans profile={profile} onEdit={setEditingKey} />

      <MonthView profile={profile} logs={byDay} today={today} />

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button type="button" variant="outline" onClick={() => setEditing(true)} className="h-11 w-full gap-2 sm:w-auto">
          <Settings2 className="size-4" />
          Ajustar plano (dias, objetivo, local)
        </Button>
        <Button
          type="button"
          variant="ghost"
          loading={update.isPending}
          onClick={() => update.mutate({ workouts_enabled: false })}
          className="h-11 w-full gap-2 text-muted-foreground sm:w-auto"
        >
          <Power className="size-4" />
          Desligar treinos
        </Button>
      </div>
    </div>
  );
}

export function WorkoutsPage() {
  const { enabled, loading } = useWorkoutsEnabled();
  const profileQuery = useWorkoutProfile(enabled);
  const logsQuery = useWorkoutLogs(enabled);
  const profile = profileQuery.data;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
          <Dumbbell className="size-6 flowy-ink" aria-hidden="true" />
          Treinos
        </h1>
        {profile && enabled ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {GOAL_LABELS[profile.goal]} · {PLACE_LABELS[profile.place]} · {profile.days.length}{" "}
            {profile.days.length === 1 ? "dia" : "dias"} por semana · {profile.minutes} min
          </p>
        ) : null}
      </header>

      {loading || (enabled && (profileQuery.isLoading || logsQuery.isLoading)) ? (
        <Skeleton className="h-72 w-full rounded-3xl" />
      ) : !enabled ? (
        <EnableCard />
      ) : !profile ? (
        <WorkoutQuestionnaire />
      ) : (
        <Dashboard profile={profile} logs={logsQuery.data ?? []} />
      )}
    </div>
  );
}
