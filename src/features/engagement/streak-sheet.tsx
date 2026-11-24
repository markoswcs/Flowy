"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Lock,
  Snowflake,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { localDateKey } from "@/features/tasks/date-utils";
import { holdOverlay } from "@/lib/overlay";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  getLeaderboard,
  setCheer,
  setRankingVisible,
  type RankEntry,
} from "@/services/ranking";

import { streakState } from "./engagement";
import { FlameArt } from "./flame-art";
import { hours, levelOf, longestStreak } from "./streak-levels";

const MEDALS = ["#fbbf24", "#cbd5e1", "#f59e0b"];

function addDays(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function Avatar({
  entry,
  size = 40,
}: {
  entry: Pick<RankEntry, "name" | "avatar_url">;
  size?: number;
}) {
  return entry.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={entry.avatar_url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(entry.name || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

const WEEK_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** A month where streak days join into one orange band, like a habit tracker. */
function StreakMonth({ done, today }: { done: Set<string>; today: string }) {
  const [offset, setOffset] = useState(0);
  const base = new Date(`${today.slice(0, 7)}-01T12:00:00`);
  base.setMonth(base.getMonth() + offset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: total }, (_, index) =>
      localDateKey(new Date(year, month, index + 1)),
    ),
  ];
  const doneInMonth = cells.filter((day) => day && done.has(day)).length;

  return (
    <section className="rounded-[1.5rem] border border-border/60 bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold capitalize">
          {MONTHS[month]}{" "}
          <span className="font-medium text-muted-foreground">{year}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-no-glow
            onClick={() => setOffset(offset - 1)}
            disabled={offset <= -3}
            aria-label="Mês anterior"
            className="grid size-8 place-items-center rounded-full hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            data-no-glow
            onClick={() => setOffset(offset + 1)}
            disabled={offset >= 0}
            aria-label="Próximo mês"
            className="grid size-8 place-items-center rounded-full hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        <b className="text-orange-400">{doneInMonth}</b>{" "}
        {doneInMonth === 1 ? "dia" : "dias"} com tarefa concluída
      </p>
      <div className="mt-3 grid grid-cols-7 gap-y-1.5 text-center">
        {WEEK_SHORT.map((letter, index) => (
          <span
            key={index}
            className="pb-1 text-[11px] font-bold text-muted-foreground"
          >
            {letter}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`pad-${index}`} />;
          const lit = done.has(day);
          const column = index % 7;
          // The band joins a day to its neighbours in the same row.
          const left = lit && column > 0 && done.has(addDays(day, -1));
          const right = lit && column < 6 && done.has(addDays(day, 1));
          return (
            <span
              key={day}
              className="relative flex h-9 items-center justify-center"
            >
              {lit ? (
                <span
                  className={cn(
                    "absolute inset-y-0.5 bg-gradient-to-b from-orange-400 to-orange-600",
                    left ? "left-0" : "left-1 rounded-l-full",
                    right ? "right-0" : "right-1 rounded-r-full",
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  "relative grid size-8 place-items-center rounded-full text-xs font-bold tabular-nums",
                  lit
                    ? "text-white"
                    : day > today
                      ? "text-muted-foreground/40"
                      : "text-muted-foreground",
                  day === today && !lit && "ring-2 ring-orange-400/70",
                  day === today && lit && "ring-2 ring-white/80",
                )}
              >
                {Number(day.slice(8))}
              </span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

/** Your streak, in the style of a language-learning app: the big number, the week, a goal and the month. */
function MyStreak({ doneDays }: { doneDays: string[] }) {
  const today = localDateKey();
  const { count, status } = streakState(doneDays, today);
  const level = levelOf(count);
  const best = Math.max(longestStreak(doneDays), count);
  const done = new Set(doneDays);
  // This week, Sunday first.
  const start = addDays(today, -new Date(`${today}T12:00:00`).getDay());
  const week = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const goal = level.next?.min ?? Math.ceil((count + 1) / 30) * 30 + 30;
  const goalStart = level.next ? level.min : goal - 30;
  const goalProgress = Math.min(1, (count - goalStart) / (goal - goalStart));
  const frozen = status === "frozen";

  return (
    <div className="space-y-4">
      {/* The big number and the flame, on a warm band. */}
      <section
        className="relative overflow-hidden rounded-[1.75rem] p-5 text-white"
        style={{
          background: frozen
            ? "linear-gradient(135deg, #0ea5e9, #1e3a8a)"
            : `linear-gradient(135deg, ${level.color}, #7c2d12)`,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p
              key={count}
              className="font-brand text-7xl font-extrabold leading-none tabular-nums drop-shadow-md animate-in zoom-in-50 fade-in duration-500"
            >
              {count}
            </p>
            <p className="mt-1 text-lg font-bold leading-tight">
              {count === 1 ? "dia seguido" : "dias seguidos"}
              <span className="block text-sm font-medium text-white/80">
                concluindo tarefas
              </span>
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-0.5 text-xs font-bold">
              <Zap className="size-3.5" /> {level.name}
            </p>
          </div>
          <FlameArt
            days={count}
            size={120}
            frozen={frozen}
            className="flowy-flame-pop"
          />
        </div>
        <p className="relative mt-4 text-sm font-medium text-white/90">
          {status === "lit"
            ? "Você está pegando fogo! Hoje já está garantido."
            : status === "waiting"
              ? "Conclua 1 tarefa hoje para não perder a sequência!"
              : frozen
                ? "Sua sequência está congelada. Conclua 1 tarefa hoje para ela voltar."
                : "Conclua uma tarefa e acenda sua primeira chama!"}
        </p>
      </section>

      {/* How it works, in three steps, for whoever is seeing it for the first time. */}
      <section
        className="rounded-[1.5rem] border border-border/60 bg-card/50 p-4"
        aria-label="Como funciona"
      >
        <p className="font-bold">Como funciona o foguinho</p>
        <ol className="mt-3 space-y-3">
          {[
            {
              icon: Check,
              color: "#34d399",
              title: "Conclua 1 tarefa no dia",
              text: "Qualquer tarefa riscada acende o foguinho daquele dia.",
            },
            {
              icon: Flame,
              color: "#fb923c",
              title: "Volte todo dia",
              text: "Cada dia seguido com uma tarefa concluída soma 1 à sua sequência.",
            },
            {
              icon: Zap,
              color: "#a855f7",
              title: "Suba de nível",
              text: "Faísca, Chama, Fogueira, Vulcão e Lenda: o foguinho muda de cor e de efeito.",
            },
            {
              icon: Snowflake,
              color: "#38bdf8",
              title: "Esqueceu um dia?",
              text: "A sequência congela, mas não apaga. Só dois dias seguidos sem tarefa zeram tudo.",
            },
          ].map(({ icon: Icon, color, title, text }, index) => (
            <li key={title} className="flex gap-3">
              <span
                className="relative grid size-9 shrink-0 place-items-center rounded-full"
                style={{ backgroundColor: `${color}26`, color }}
              >
                <Icon className="size-4" strokeWidth={2.5} />
                <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-card text-[9px] font-bold text-muted-foreground">
                  {index + 1}
                </span>
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{title}</span>
                <span className="block text-xs leading-5 text-muted-foreground">
                  {text}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* This week: done days are joined by a band. */}
      <section className="rounded-[1.5rem] border border-border/60 bg-card/50 p-4">
        <div className="grid grid-cols-7 text-center">
          {week.map((day, index) => {
            const lit = done.has(day);
            const left = lit && index > 0 && done.has(week[index - 1]!);
            const right = lit && index < 6 && done.has(week[index + 1]!);
            const isToday = day === today;
            return (
              <div key={day} className="flex flex-col items-center gap-2">
                <span
                  className={cn(
                    "text-xs font-bold",
                    isToday ? "text-orange-400" : "text-muted-foreground",
                  )}
                >
                  {WEEK_SHORT[index]}
                </span>
                <span className="relative flex h-10 w-full items-center justify-center">
                  {lit ? (
                    <span
                      className={cn(
                        "absolute inset-y-1 bg-orange-500/30",
                        left ? "left-0" : "left-1/2",
                        right ? "right-0" : "right-1/2",
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative grid size-10 place-items-center rounded-full",
                      lit
                        ? "bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-[0_4px_0] shadow-orange-800"
                        : "bg-muted/50",
                      isToday && !lit && "ring-2 ring-orange-400/70",
                    )}
                  >
                    {lit ? (
                      <Check className="size-5" strokeWidth={3.5} />
                    ) : day > today ? null : (
                      <span className="size-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* A goal to reach: the next level. */}
      <section className="rounded-[1.5rem] border border-border/60 bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <p className="font-bold">Meta de sequência</p>
          <p
            className="text-sm font-bold"
            style={{ color: level.next?.color ?? level.color }}
          >
            {count}/{goal} dias
          </p>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <FlameArt days={goalStart} size={28} />
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted/60">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${Math.max(8, goalProgress * 100)}%`,
                background: `linear-gradient(90deg, ${level.color}, ${level.next?.color ?? level.color})`,
              }}
            />
            <span
              className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/25"
              aria-hidden="true"
            />
          </div>
          <FlameArt days={goal} size={34} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {level.next ? (
            <>
              Mais <b className="text-foreground">{level.toNext}</b>{" "}
              {level.toNext === 1 ? "dia" : "dias"} e seu foguinho vira{" "}
              <b style={{ color: level.next.color }}>{level.next.name}</b>.
            </>
          ) : (
            "Você já é uma lenda. Cada 30 dias a mais é uma nova meta."
          )}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: "Recorde",
            value: `${best} ${best === 1 ? "dia" : "dias"}`,
            icon: Trophy,
            color: "#fbbf24",
          },
          { label: "Nível", value: level.name, icon: Zap, color: level.color },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-3"
          >
            <span
              className="grid size-10 place-items-center rounded-xl"
              style={{ backgroundColor: `${color}26`, color }}
            >
              <Icon className="size-5" />
            </span>
            <span>
              <span className="block font-bold">{value}</span>
              <span className="block text-xs text-muted-foreground">
                {label}
              </span>
            </span>
          </div>
        ))}
      </div>

      <StreakMonth done={done} today={today} />
    </div>
  );
}

/** "ativo hoje", "ativo ontem", "ativo há 3 dias". */
function lastSeen(day: string | null | undefined) {
  if (!day) return null;
  const today = localDateKey();
  if (day === today) return "ativo hoje";
  if (day === addDays(today, -1)) return "ativo ontem";
  const diff = Math.round(
    (Date.parse(`${today}T12:00:00`) - Date.parse(`${day}T12:00:00`)) /
      86_400_000,
  );
  return `ativo há ${diff} dias`;
}

/** An avatar inside a ring in the colour of the person's level, like a story. */
function StoryRing({ entry, size }: { entry: RankEntry; size: number }) {
  const level = levelOf(entry.streak);
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center rounded-full p-[2.5px]"
      style={{
        background: entry.streak
          ? `conic-gradient(${level.color}, ${level.next?.color ?? "#22d3ee"}, ${level.color})`
          : "hsl(var(--muted))",
      }}
    >
      <span className="rounded-full bg-card p-[2px]">
        <Avatar entry={entry} size={size} />
      </span>
      <span className="absolute -bottom-1 -right-1 rounded-full bg-card p-0.5">
        <FlameArt days={entry.streak} size={Math.round(size * 0.42)} />
      </span>
    </span>
  );
}

/** One person in the feed: who, the flame, the week, training and "Dar força". */
function PersonCard({
  entry,
  place,
  highlight,
}: {
  entry: RankEntry;
  place: number | null;
  highlight: boolean;
}) {
  const queryClient = useQueryClient();
  const level = levelOf(entry.streak);
  const cheer = useMutation({
    mutationFn: (on: boolean) => setCheer(entry.user_id, on),
    onMutate: (on) => {
      queryClient.setQueryData<RankEntry[]>(["leaderboard"], (list) =>
        list?.map((item) =>
          item.user_id === entry.user_id
            ? {
                ...item,
                cheered_today: on,
                cheers: (item.cheers ?? 0) + (on ? 1 : -1),
              }
            : item,
        ),
      );
      if (on) navigator.vibrate?.(12);
    },
    onError: () => {
      toast.error("Não foi possível mandar agora.");
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
  const seen = lastSeen(entry.last_active);
  const social = entry.cheers !== undefined;

  return (
    <article
      id={`rank-${entry.user_id}`}
      className={cn(
        "scroll-mt-4 overflow-hidden rounded-[1.5rem] border bg-card/60 transition-shadow duration-500",
        entry.is_me ? "border-primary/40" : "border-border/60",
        highlight && "shadow-[0_0_0_2px] shadow-primary",
      )}
    >
      <header className="flex items-center gap-3 p-3.5 pb-2">
        <StoryRing entry={entry} size={38} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="truncate font-semibold">
              {entry.is_me ? "Você" : entry.name}
            </span>
            <span
              className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold"
              style={{
                backgroundColor: `${level.color}26`,
                color: level.color,
              }}
            >
              {level.name}
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {seen ?? (entry.visible ? "no ranking" : "perfil privado")}
          </p>
        </div>
        {place ? (
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full font-brand text-sm font-extrabold"
            style={
              place <= 3
                ? { background: MEDALS[place - 1], color: "#1c1917" }
                : { background: "hsl(var(--muted))" }
            }
          >
            {place === 1 ? <Crown className="size-4" /> : `${place}º`}
          </span>
        ) : (
          <EyeOff className="size-4 text-muted-foreground" />
        )}
      </header>

      <div
        className="flex items-center gap-4 px-3.5 py-2"
        style={{
          background: `linear-gradient(90deg, ${level.color}1f, transparent 70%)`,
        }}
      >
        <FlameArt days={entry.streak} size={56} />
        <div className="min-w-0">
          <p className="font-brand text-3xl font-extrabold leading-none tabular-nums">
            {entry.streak}
          </p>
          <p className="text-xs text-muted-foreground">
            {entry.streak === 0
              ? "sem sequência agora"
              : entry.streak === 1
                ? "dia seguido"
                : "dias seguidos"}{" "}
            · {entry.active_days} ativos no mês
          </p>
        </div>
      </div>

      {entry.week?.length ? (
        <div className="grid grid-cols-7 gap-1 px-3.5 pt-2.5">
          {entry.week.map((lit, index) => (
            <span key={index} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "h-1.5 w-full rounded-full",
                  lit ? "" : "bg-muted/60",
                )}
                style={
                  lit
                    ? {
                        background: `linear-gradient(90deg, ${level.color}, ${level.next?.color ?? level.color})`,
                      }
                    : undefined
                }
              />
              <span className="text-[9px] text-muted-foreground">
                {WEEK_LETTERS[(new Date().getDay() + index + 1) % 7]}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {entry.trains ? (
        <p className="mx-3.5 mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <Dumbbell className="size-4 shrink-0" />
          {entry.workouts
            ? `${entry.workouts} ${entry.workouts === 1 ? "treino" : "treinos"} no mês · ${hours(entry.workout_minutes)} treinando`
            : "Começou a treinar no Flowy"}
        </p>
      ) : null}

      <footer className="mt-3 flex items-center gap-2 border-t border-border/40 px-3.5 py-2.5">
        {social ? (
          entry.is_me ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flame className="size-4 text-orange-400" />
              {entry.cheers
                ? `${entry.cheers} ${entry.cheers === 1 ? "pessoa te deu" : "forças recebidas"} força esta semana`
                : "Ninguém te deu força ainda esta semana"}
            </p>
          ) : (
            <>
              <button
                type="button"
                data-no-glow
                disabled={cheer.isPending}
                onClick={() => cheer.mutate(!entry.cheered_today)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all active:scale-90",
                  entry.cheered_today
                    ? "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
                    : "bg-muted/50 text-foreground hover:bg-muted",
                )}
              >
                <Flame
                  className={cn(
                    "size-4",
                    entry.cheered_today ? "flowy-flame" : "text-orange-400",
                  )}
                />
                {entry.cheered_today ? "Força enviada" : "Dar força"}
              </button>
              <span className="text-xs text-muted-foreground">
                {entry.cheers
                  ? `${entry.cheers} ${entry.cheers === 1 ? "força" : "forças"} esta semana`
                  : "Seja o primeiro a dar força"}
              </span>
            </>
          )
        ) : (
          <span className="text-xs text-muted-foreground">
            {entry.active_days} dias ativos no mês
          </span>
        )}
      </footer>
    </article>
  );
}

const WEEK_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** The ranking as a little social network: stories on top, everyone's card below. */
function Ranking() {
  const queryClient = useQueryClient();
  const board = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
    staleTime: 60_000,
  });
  const [focus, setFocus] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "trains">("all");
  const privacy = useMutation({
    mutationFn: setRankingVisible,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
    onError: () => toast.error("Não foi possível mudar. Tente de novo."),
  });
  const entries = board.data ?? [];
  const me = entries.find((entry) => entry.is_me);
  const listed = entries.filter((entry) => entry.visible);
  const shown = listed.filter((entry) => filter === "all" || entry.trains);
  const placeOf = (entry: RankEntry) =>
    entry.visible
      ? listed.findIndex((item) => item.user_id === entry.user_id) + 1
      : null;

  function openStory(entry: RankEntry) {
    setFocus(entry.user_id);
    if (filter === "trains" && !entry.trains) setFilter("all");
    window.setTimeout(
      () =>
        document
          .getElementById(`rank-${entry.user_id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
    window.setTimeout(() => setFocus(null), 1800);
  }

  if (board.isLoading)
    return <div className="h-64 animate-pulse rounded-[1.75rem] bg-muted/30" />;
  if (board.isError)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        O ranking ainda não está disponível.
      </p>
    );

  return (
    <div className="space-y-4">
      {/* Stories: everyone's flame at a glance; a tap jumps to their card. */}
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {[...(me ? [me] : []), ...listed.filter((entry) => !entry.is_me)].map(
          (entry) => (
            <button
              key={entry.user_id}
              type="button"
              data-no-glow
              onClick={() => openStory(entry)}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <StoryRing entry={entry} size={52} />
              <span
                className={cn(
                  "w-full truncate text-center text-[11px]",
                  entry.is_me
                    ? "font-semibold flowy-ink"
                    : "text-muted-foreground",
                )}
              >
                {entry.is_me ? "Você" : entry.name.split(" ")[0]}
              </span>
            </button>
          ),
        )}
      </div>

      <div className="flex items-center gap-2">
        <div
          className="flex rounded-full bg-muted/40 p-0.5 text-xs font-semibold"
          role="group"
          aria-label="Filtrar"
        >
          {(
            [
              ["all", "Todos"],
              ["trains", "Quem treina"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              data-no-glow
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1.5 transition-colors",
                filter === value
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          role="switch"
          data-no-glow
          aria-checked={me?.visible ?? true}
          disabled={privacy.isPending || !me}
          onClick={() => privacy.mutate(!(me?.visible ?? true))}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold"
        >
          {me?.visible ? (
            <Eye className="size-3.5 text-emerald-400" />
          ) : (
            <Lock className="size-3.5" />
          )}
          {me?.visible ? "Público" : "Privado"}
        </button>
      </div>

      {me && !me.visible ? (
        <p className="rounded-2xl bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
          Seu perfil está privado: ninguém vê você aqui. Toque em “Privado” para
          participar.
        </p>
      ) : null}

      {shown.length ? (
        <div className="space-y-3">
          {shown.map((entry) => (
            <PersonCard
              key={entry.user_id}
              entry={entry}
              place={placeOf(entry)}
              highlight={focus === entry.user_id}
            />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Ninguém aqui ainda. Seja o primeiro!
        </p>
      )}

      {me && !me.visible ? (
        <PersonCard entry={me} place={null} highlight={focus === me.user_id} />
      ) : null}
    </div>
  );
}

/** The streak screen: your flame and the ranking, in a sheet. */
export function StreakSheet({
  doneDays,
  onClose,
}: {
  doneDays: string[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"me" | "rank">("me");
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

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sequência de dias"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 animate-in fade-in bg-black/60"
      />
      <section className="relative max-h-[92dvh] w-full max-w-md animate-in overflow-y-auto rounded-t-[2rem] border border-border/60 bg-card p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl slide-in-from-bottom-8 sm:rounded-[2rem]">
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden"
          aria-hidden="true"
        />
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 rounded-xl bg-muted/40 p-1"
            role="tablist"
          >
            {(
              [
                ["me", "Sua sequência", Flame],
                ["rank", "Ranking", Trophy],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                data-no-glow
                onClick={() => setTab(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-colors",
                  tab === value
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    tab === value &&
                      (value === "me" ? "text-orange-400" : "text-amber-300"),
                  )}
                />{" "}
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4">
          {tab === "me" ? <MyStreak doneDays={doneDays} /> : <Ranking />}
        </div>
      </section>
    </div>,
    document.body,
  );
}
