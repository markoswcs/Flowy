"use client";

import {
  Check,
  ChevronRight,
  Dumbbell,
  Minus,
  Moon,
  Pencil,
  Power,
  Repeat,
  Settings2,
  SkipForward,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdatePreferences } from "@/features/settings/use-settings";
import { localDateKey } from "@/features/tasks/date-utils";
import { FeatureTip } from "@/components/feature-tip";
import { cn } from "@/lib/utils";

import { WorkoutEditor } from "./components/workout-editor";
import { WorkoutQuestionnaire } from "./components/questionnaire";
import { WorkoutSession } from "./components/workout-session";
import { BodyWeightCard } from "./components/body-weight-card";
import { MuscleMap } from "./components/muscle-map";
import { RestTimerBar } from "./components/rest-timer";
import { StatsTiles } from "./components/stats-tiles";
import { TrainingStats } from "./components/training-stats";
import { rotationKey } from "./training";
import { useLoggedSets } from "./use-strength";
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
import {
  GOAL_LABELS,
  PLACE_LABELS,
  SPLIT_LABELS,
  type WorkoutLog,
  type WorkoutProfile,
  type WorkoutSplit,
} from "./types";
import {
  useSavePlanStyle,
  useWorkoutLogs,
  useWorkoutProfile,
  useWorkoutsEnabled,
} from "./use-workouts";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAY_LONG = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

function parseDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year!, month! - 1, date!);
}

const STATUS_STYLE: Record<
  DayStatus,
  { label: string; className: string; icon?: typeof Check }
> = {
  done: {
    label: "Treinou",
    className: "bg-emerald-500 text-white shadow-[0_0_14px_-2px] shadow-emerald-500/70",
    icon: Check,
  },
  skipped: {
    label: "Pulou",
    className: "bg-muted text-muted-foreground",
    icon: SkipForward,
  },
  missed: {
    label: "Não treinou",
    className: "bg-destructive/15 text-destructive ring-destructive/25",
    icon: X,
  },
  rest: {
    label: "Descanso",
    className: "text-muted-foreground/60",
    icon: Minus,
  },
  today: {
    label: "Hoje",
    className: "bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_0_16px_-2px] shadow-fuchsia-500/70",
  },
  planned: {
    label: "Treino previsto",
    className: "bg-violet-500/20 text-violet-100 ring-violet-400/40",
  },
  before: { label: "", className: "text-muted-foreground/40" },
};

function EnableCard() {
  const update = useUpdatePreferences();
  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-border/60 bg-card/50 p-6 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl flowy-active">
        <Dumbbell className="size-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">
        Acompanhe seus treinos no Flowy
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Um plano montado para você, os dias em que treinou e a explicação de
        cada exercício. Dá para desligar quando quiser em Configurações.
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

function WeekStrip({
  profile,
  logs,
  today,
  selected,
  onPick,
}: {
  profile: WorkoutProfile;
  logs: Map<string, WorkoutLog>;
  today: string;
  selected: string | null;
  onPick: (day: string | null) => void;
}) {
  return (
    <div
      className="grid grid-cols-7 gap-1.5"
      role="list"
      aria-label="Esta semana"
    >
      {weekDays(today).map((day) => {
        const status = dayStatus(profile, logs, day, today);
        const style = STATUS_STYLE[status];
        const Icon = style.icon;
        const date = parseDay(day);
        return (
          <div key={day} role="listitem">
            <button
              type="button"
              disabled={day > today}
              onClick={() =>
                onPick(day === today || day === selected ? null : day)
              }
              aria-pressed={day === selected}
              aria-label={`${WEEKDAY_LONG[date.getDay()]} ${date.getDate()}: ${style.label || "sem plano"}${day < today ? ". Toque para lançar ou editar" : ""}`}
              className={cn(
                "flex w-full flex-col items-center gap-1.5 rounded-2xl border bg-card/40 py-2.5 transition-colors enabled:hover:border-violet-400/40",
                day === selected
                  ? "border-violet-400/70 bg-violet-500/10"
                  : "border-border/40",
              )}
            >
              <span className="text-[11px] font-medium uppercase text-muted-foreground">
                {WEEKDAY_SHORT[date.getDay()]}
              </span>
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full text-sm font-semibold ring-1 ring-transparent",
                  style.className,
                )}
              >
                {Icon ? (
                  <Icon className="size-4" aria-hidden="true" />
                ) : (
                  date.getDate()
                )}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  profile,
  logs,
  today,
}: {
  profile: WorkoutProfile;
  logs: Map<string, WorkoutLog>;
  today: string;
}) {
  const days = monthDays(today);
  const leading = (parseDay(days[0]!).getDay() + 6) % 7;
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    parseDay(today),
  );
  const legend: DayStatus[] = ["done", "missed", "skipped", "planned"];
  return (
    <section
      id="workout-month"
      className="scroll-mt-24 rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6"
      aria-label="Mês"
    >
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
            <span
              className={cn(
                "size-3 shrink-0 rounded-full ring-1 ring-transparent",
                STATUS_STYLE[status].className,
              )}
            />
            {STATUS_STYLE[status].label}
          </span>
        ))}
      </div>
    </section>
  );
}

function nextTraining(
  profile: WorkoutProfile,
  today: string,
  rotationNext: string | null,
) {
  const cursor = parseDay(today);
  for (let step = 1; step <= 7; step += 1) {
    cursor.setDate(cursor.getDate() + 1);
    const day = localDateKey(cursor);
    const key = sessionKeyFor(profile, day);
    if (key)
      return {
        day,
        session: buildSession(profile, rotationNext ?? key),
        weekday: WEEKDAY_LONG[cursor.getDay()]!,
      };
  }
  return null;
}

/** Ready-made splits and the rotation switch. */
function PlanStyle({
  profile,
  rotating,
}: {
  profile: WorkoutProfile;
  rotating: boolean;
}) {
  const save = useSavePlanStyle();
  const split = profile.split ?? "auto";
  const forced = !profile.rotation && rotating;
  return (
    <div className="space-y-3">
      <FeatureTip
        id="treinos-planos"
        title="Planos prontos e rodízio"
        text="Escolha Push/Pull/Legs, Superior/Inferior, Corpo todo ou 5×5. No rodízio, o próximo treino é o que vem depois do último feito."
        align="start"
      >
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Divisão do treino"
        >
          {(Object.keys(SPLIT_LABELS) as WorkoutSplit[]).map((value) => (
            <button
              key={value}
              type="button"
              title={SPLIT_LABELS[value].hint}
              aria-pressed={split === value}
              disabled={save.isPending}
              onClick={() => save.mutate({ split: value })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                split === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {SPLIT_LABELS[value].label}
            </button>
          ))}
        </div>
      </FeatureTip>
      <p className="text-xs text-muted-foreground">
        {SPLIT_LABELS[split].hint}.
      </p>
      <button
        type="button"
        role="switch"
        aria-checked={rotating}
        disabled={save.isPending || forced}
        onClick={() => save.mutate({ rotation: !profile.rotation })}
        className="flex w-full items-center gap-3 rounded-2xl bg-muted/30 p-3 text-left disabled:opacity-80"
      >
        <Repeat className="size-4 shrink-0 flowy-ink" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Rodízio</span>
          <span className="block text-xs text-muted-foreground">
            {forced
              ? "Ligado porque há mais treinos do que dias: cada dia faz o próximo da fila."
              : "O próximo treino é o seguinte ao último feito, não importa o dia da semana."}
          </span>
        </span>
        <span
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
            rotating ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
              rotating ? "left-[1.125rem]" : "left-0.5",
            )}
          />
        </span>
      </button>
    </div>
  );
}

/** A past day: pick which workout it was and log its sets, as if done on paper. */
function PastDay({
  profile,
  day,
  log,
  plannedKey,
  onClose,
}: {
  profile: WorkoutProfile;
  day: string;
  log?: WorkoutLog;
  plannedKey: string;
  onClose: () => void;
}) {
  const keys = sessionKeys(profile);
  const [key, setKey] = useState(
    log?.session && keys.includes(log.session) ? log.session : plannedKey,
  );
  const date = parseDay(day);
  const label = `${WEEKDAY_LONG[date.getDay()]}, ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Qual treino foi"
        >
          {keys.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={key === option}
              onClick={() => setKey(option)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                key === option
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {buildSession(profile, option).name}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar o dia"
        >
          <X className="size-5" />
        </Button>
      </div>
      <WorkoutSession
        key={`${day}-${key}`}
        session={buildSession(profile, key)}
        profile={profile}
        day={day}
        log={log}
        title={`Treino de ${label}`}
        startOpen
      />
    </div>
  );
}

/** Each workout of the week once, with the weekdays it falls on. */
function WeekPlans({
  profile,
  rotating,
  onEdit,
}: {
  profile: WorkoutProfile;
  rotating: boolean;
  onEdit: (key: string) => void;
}) {
  const keys = sessionKeys(profile);
  const days = [...new Set(profile.days)].sort((a, b) => a - b);
  const byKey = new Map<string, number[]>();
  days.forEach((weekday, index) => {
    const key = keys[index % keys.length]!;
    byKey.set(key, [...(byKey.get(key) ?? []), weekday]);
  });
  return (
    <section
      className="rounded-3xl border border-border/60 bg-card/50 p-4 sm:p-6"
      aria-label="Seus treinos"
    >
      <h2 className="font-semibold">Seus treinos</h2>
      <div className="mt-3">
        <PlanStyle profile={profile} rotating={rotating} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Toque num treino para tirar, trocar ou adicionar exercícios e montar
        bi-sets.
      </p>
      <ul className="mt-3 space-y-2">
        {(rotating
          ? keys.map((key) => [key, [] as number[]] as const)
          : [...byKey]
        ).map(([key, weekdays], position) => {
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
                  <span className="block font-medium leading-snug">
                    {session.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {rotating
                      ? `${position + 1}º na fila`
                      : weekdays
                          .map((weekday) => WEEKDAY_SHORT[weekday])
                          .join(", ")}{" "}
                    · {session.exercises.length} exercícios
                    {session.custom ? " · editado por você" : ""}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Dashboard({
  profile,
  logs,
}: {
  profile: WorkoutProfile;
  logs: WorkoutLog[];
}) {
  const [editing, setEditing] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const update = useUpdatePreferences();
  const sets = useLoggedSets();
  const today = localDateKey();
  const byDay = useMemo(
    () => new Map(logs.map((log) => [log.day, log])),
    [logs],
  );
  const [pastDay, setPastDay] = useState<string | null>(null);
  const [trainAnyway, setTrainAnyway] = useState(false);
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const keys = sessionKeys(profile);
  // More workouts than days (e.g. Push/Pull/Legs on 2 days) only works as a queue.
  const rotating =
    Boolean(profile.rotation) || keys.length > new Set(profile.days).size;
  const doneLogs = logs.filter((log) => log.status === "done");
  const queueNext = rotating ? rotationKey(keys, doneLogs, today) : null;
  const plannedToday = sessionKeyFor(profile, today);
  const loggedToday = byDay.get(today)?.session;
  const todayKey =
    loggedToday && keys.includes(loggedToday)
      ? loggedToday
      : chosenKey && keys.includes(chosenKey)
        ? chosenKey
        : plannedToday || trainAnyway
        ? (queueNext ?? plannedToday ?? keys[0] ?? null)
        : null;
  const next = todayKey ? null : nextTraining(profile, today, queueNext);
  const streak = currentStreak(profile, byDay, today);

  if (editing) {
    return (
      <WorkoutQuestionnaire
        initial={profile}
        onSaved={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
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
      <StatsTiles logs={logs} history={sets.data ?? []} streak={streak} today={today} />

      <WeekStrip
        profile={profile}
        logs={byDay}
        today={today}
        selected={pastDay}
        onPick={setPastDay}
      />

      {pastDay ? (
        <PastDay
          key={pastDay}
          profile={profile}
          day={pastDay}
          log={byDay.get(pastDay)}
          plannedKey={
            (rotating
              ? rotationKey(keys, doneLogs, pastDay)
              : sessionKeyFor(profile, pastDay)) ?? keys[0]!
          }
          onClose={() => setPastDay(null)}
        />
      ) : todayKey ? (
        <div className="space-y-2">
          {choosing ? (
            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-muted/30 p-2 animate-in fade-in slide-in-from-top-1" role="group" aria-label="Fazer outro treino hoje">
              {keys.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={key === todayKey}
                  onClick={() => {
                    setChosenKey(key);
                    setChoosing(false);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    key === todayKey ? "bg-primary text-primary-foreground" : "bg-background/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {buildSession(profile, key).name}
                </button>
              ))}
            </div>
          ) : null}
          <WorkoutSession
            key={todayKey}
            session={buildSession(profile, todayKey)}
            profile={profile}
            day={today}
            log={byDay.get(today)}
            onEdit={() => setEditingKey(todayKey)}
            onChooseOther={byDay.get(today) || keys.length < 2 ? undefined : () => setChoosing((value) => !value)}
          />
        </div>
      ) : (
        <section className="rounded-3xl border border-border/60 bg-card/50 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Moon className="size-4 flowy-ink" aria-hidden="true" />
            Hoje é dia de descanso
          </p>
          {next ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Próximo treino:{" "}
              <span className="font-medium text-foreground">
                {next.session.name}
              </span>
              , na {next.weekday}.
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 gap-1.5"
            onClick={() => setTrainAnyway(true)}
          >
            <Dumbbell className="size-3.5" />
            Treinar hoje mesmo assim
          </Button>
        </section>
      )}

      <MuscleMap history={sets.data ?? []} />

      <TrainingStats history={sets.data ?? []} logs={logs} />

      <BodyWeightCard profile={profile} />

      <WeekPlans profile={profile} rotating={rotating} onEdit={setEditingKey} />

      <MonthView profile={profile} logs={byDay} today={today} />

      <RestTimerBar />

      <div className="grid gap-2 sm:flex sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={() => setEditing(true)}
          className="h-11 w-full gap-2 sm:w-auto"
        >
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
            {GOAL_LABELS[profile.goal]} · {PLACE_LABELS[profile.place]} ·{" "}
            {profile.days.length} {profile.days.length === 1 ? "dia" : "dias"}{" "}
            por semana · {profile.minutes} min
          </p>
        ) : null}
      </header>

      {loading ||
      (enabled && (profileQuery.isLoading || logsQuery.isLoading)) ? (
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
