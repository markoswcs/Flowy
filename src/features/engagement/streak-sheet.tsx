"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Lock,
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
import { LEVELS, hours, levelOf, longestStreak } from "./streak-levels";

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

/** Your streak: the flame, the last two weeks, the level and the record. */
function MyStreak({ doneDays }: { doneDays: string[] }) {
  const today = localDateKey();
  const { count, status } = streakState(doneDays, today);
  const level = levelOf(count);
  const best = Math.max(longestStreak(doneDays), count);
  const done = new Set(doneDays);
  const last = Array.from({ length: 14 }, (_, index) =>
    addDays(today, index - 13),
  );
  const month = doneDays.filter((day) => day > addDays(today, -30)).length;

  return (
    <div className="space-y-5">
      <div
        className="relative overflow-hidden rounded-[1.75rem] border border-white/10 p-6 text-center"
        style={{
          background: `radial-gradient(120% 90% at 50% 0%, ${level.color}40, transparent 70%)`,
        }}
      >
        <span className="mx-auto grid place-items-center">
          <FlameArt days={count} size={112} frozen={status === "frozen"} />
        </span>
        <p
          key={count}
          className="mt-3 font-brand text-6xl font-extrabold leading-none tabular-nums animate-in zoom-in-50 fade-in duration-500"
        >
          {count}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {count === 1 ? "dia seguido" : "dias seguidos"}
        </p>
        <p
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: `${level.color}26`, color: level.color }}
        >
          <Zap className="size-3.5" /> {level.name}
        </p>
        {level.next ? (
          <div className="mx-auto mt-4 max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${Math.max(6, level.progress * 100)}%`,
                  background: `linear-gradient(90deg, ${level.color}, ${level.next.color})`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Faltam <b className="text-foreground">{level.toNext}</b>{" "}
              {level.toNext === 1 ? "dia" : "dias"} para{" "}
              <b style={{ color: level.next.color }}>{level.next.name}</b>
            </p>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Nível máximo. Você é uma lenda.
          </p>
        )}
        <p className="mt-4 text-sm">
          {status === "lit"
            ? "Hoje já está garantido. Volte amanhã!"
            : status === "waiting"
              ? "Conclua 1 tarefa hoje para a chama crescer."
              : status === "frozen"
                ? "Ontem passou em branco. Conclua 1 tarefa hoje e a sequência volta."
                : "Conclua uma tarefa para acender a primeira chama."}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Últimas 2 semanas
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {last.map((day) => {
            const lit = done.has(day);
            const isToday = day === today;
            return (
              <span
                key={day}
                title={day}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-xl text-[10px] font-semibold",
                  lit ? "text-white" : "bg-muted/40 text-muted-foreground",
                  isToday && "ring-2 ring-primary/60",
                )}
                style={
                  lit
                    ? {
                        background: "linear-gradient(160deg, #fb923c, #ef4444)",
                      }
                    : undefined
                }
              >
                {lit ? <Flame className="size-4" /> : Number(day.slice(8))}
              </span>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Recorde", value: best, icon: Trophy, color: "#fbbf24" },
          { label: "Dias no mês", value: month, icon: Flame, color: "#fb923c" },
          {
            label: "Nível",
            value: LEVELS.findIndex((item) => item.name === level.name),
            icon: Zap,
            color: level.color,
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/60 bg-card/50 p-3"
          >
            <Icon className="mx-auto size-4" style={{ color }} />
            <p className="mt-1 font-brand text-2xl font-bold tabular-nums">
              {value}
            </p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <p className="rounded-2xl bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
        Conclua pelo menos 1 tarefa por dia. Um dia perdido congela a sequência,
        mas não quebra; dois seguidos, sim.
      </p>
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
