"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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
  setRankingVisible,
  type RankEntry,
} from "@/services/ranking";

import { streakState } from "./engagement";
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
        <span
          className={cn(
            "mx-auto grid size-24 place-items-center rounded-full",
            status === "frozen" ? "bg-sky-400/15 text-sky-300" : "",
          )}
          style={
            status === "frozen"
              ? undefined
              : {
                  backgroundColor: `${level.color}26`,
                  color: level.color,
                  boxShadow: `0 0 60px ${level.color}55`,
                }
          }
        >
          {status === "frozen" ? (
            <Snowflake className="flowy-frost size-12" />
          ) : (
            <Flame
              className={cn(
                "size-12",
                status === "lit" ? "flowy-flame" : "flowy-ember",
              )}
            />
          )}
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

/** Everyone's flames: a podium for the top three and the rest in a list. */
function Ranking() {
  const queryClient = useQueryClient();
  const board = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
    staleTime: 60_000,
  });
  const privacy = useMutation({
    mutationFn: setRankingVisible,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
    onError: () => toast.error("Não foi possível mudar. Tente de novo."),
  });
  const entries = board.data ?? [];
  const me = entries.find((entry) => entry.is_me);
  const listed = entries.filter((entry) => entry.visible);
  const podium = listed.slice(0, 3);
  const rest = listed.slice(3);
  const myPlace =
    me && me.visible ? listed.findIndex((entry) => entry.is_me) + 1 : null;

  if (board.isLoading)
    return <div className="h-64 animate-pulse rounded-[1.75rem] bg-muted/30" />;
  if (board.isError)
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        O ranking ainda não está disponível.
      </p>
    );

  return (
    <div className="space-y-5">
      <button
        type="button"
        role="switch"
        aria-checked={me?.visible ?? true}
        disabled={privacy.isPending || !me}
        onClick={() => privacy.mutate(!(me?.visible ?? true))}
        className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-3 text-left"
      >
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            me?.visible
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {me?.visible ? (
            <Eye className="size-5" />
          ) : (
            <Lock className="size-5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {me?.visible ? "Você aparece no ranking" : "Perfil privado"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {me?.visible
              ? "Só seu nome, foto e números. Toque para ficar privado."
              : "Ninguém vê você aqui. Toque para participar."}
          </span>
        </span>
        <span
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full transition-colors",
            me?.visible ? "bg-emerald-500" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
              me?.visible ? "left-[1.125rem]" : "left-0.5",
            )}
          />
        </span>
      </button>

      {podium.length ? (
        <div className="flex items-end justify-center gap-2 pt-4">
          {[podium[1], podium[0], podium[2]].map((entry, slot) => {
            if (!entry) return <div key={slot} className="flex-1" />;
            const place = slot === 1 ? 1 : slot === 0 ? 2 : 3;
            const height = place === 1 ? "h-28" : place === 2 ? "h-20" : "h-14";
            return (
              <div
                key={entry.user_id}
                className="flex min-w-0 flex-1 flex-col items-center animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${place * 120}ms` }}
              >
                {place === 1 ? (
                  <Crown className="mb-1 size-6 animate-bounce text-amber-300" />
                ) : null}
                <div
                  className="rounded-full p-0.5"
                  style={{ background: MEDALS[place - 1] }}
                >
                  <Avatar entry={entry} size={place === 1 ? 64 : 52} />
                </div>
                <p
                  className={cn(
                    "mt-1.5 w-full truncate text-center text-xs font-semibold",
                    entry.is_me && "flowy-ink",
                  )}
                >
                  {entry.is_me ? "Você" : entry.name.split(" ")[0]}
                </p>
                <p className="inline-flex items-center gap-0.5 text-xs font-bold text-orange-400">
                  <Flame className="size-3.5" /> {entry.streak}
                </p>
                <div
                  className={cn(
                    "mt-1.5 grid w-full place-items-start justify-center rounded-t-2xl pt-2 font-brand text-2xl font-extrabold text-black/70",
                    height,
                  )}
                  style={{
                    background: `linear-gradient(180deg, ${MEDALS[place - 1]}, ${MEDALS[place - 1]}88)`,
                  }}
                >
                  {place}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Ninguém no ranking ainda. Seja o primeiro!
        </p>
      )}

      {rest.length ? (
        <ol className="space-y-1.5">
          {rest.map((entry, index) => (
            <RankRow key={entry.user_id} entry={entry} place={index + 4} />
          ))}
        </ol>
      ) : null}

      {me && !me.visible ? (
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Só você vê
          </p>
          <RankRow entry={me} place={null} />
        </div>
      ) : myPlace && myPlace > 3 ? (
        <p className="text-center text-xs text-muted-foreground">
          Você está em {myPlace}º lugar. Bora subir!
        </p>
      ) : null}
    </div>
  );
}

function RankRow({ entry, place }: { entry: RankEntry; place: number | null }) {
  const level = levelOf(entry.streak);
  return (
    <li
      className={cn(
        "flex list-none items-center gap-3 rounded-2xl border p-2.5",
        entry.is_me
          ? "border-primary/50 bg-primary/[0.08]"
          : "border-border/50 bg-card/40",
      )}
    >
      <span className="w-6 shrink-0 text-center font-brand text-sm font-bold text-muted-foreground">
        {place ?? <EyeOff className="mx-auto size-4" />}
      </span>
      <Avatar entry={entry} size={36} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">
            {entry.is_me ? "Você" : entry.name}
          </span>
          <span
            className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold"
            style={{ backgroundColor: `${level.color}26`, color: level.color }}
          >
            {level.name}
          </span>
        </span>
        <span className="mt-0.5 flex flex-wrap gap-x-2.5 text-[11px] text-muted-foreground">
          <span>{entry.active_days} dias ativos</span>
          {entry.trains ? (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Dumbbell className="size-3" /> {entry.workouts} treinos ·{" "}
              {hours(entry.workout_minutes)}
            </span>
          ) : null}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5 font-brand text-lg font-extrabold text-orange-400">
        <Flame className="size-4" /> {entry.streak}
      </span>
    </li>
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
