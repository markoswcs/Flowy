import {
  Activity,
  CalendarCheck,
  CalendarDays,
  Check,
  Disc3,
  Dumbbell,
  Flame,
  GraduationCap,
  Link2,
  Repeat,
  Scale,
  Trophy,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import styles from "./landing.module.css";

/** A phone frame with a notch; the screen is whatever goes inside. */
export function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(styles.phone, className)}>
      <div className={cn(styles.phoneScreen, "h-full")}>{children}</div>
    </div>
  );
}

const WEEK = [
  { day: "S", date: 24, state: "done" },
  { day: "T", date: 25, state: "rest" },
  { day: "Q", date: 26, state: "done" },
  { day: "Q", date: 27, state: "today" },
  { day: "S", date: 28, state: "plan" },
  { day: "S", date: 29, state: "rest" },
  { day: "D", date: 30, state: "rest" },
];

/** Treinos on the phone: numbers, the week and today's workout with sets. */
export function TreinosScreen() {
  return (
    <div className="px-3.5 pb-4 pt-9 text-left text-white">
      <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">Treinos</p>
      <p className="text-[9px] text-white/45">Ganhar massa · Academia · 4 dias</p>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {[
          { icon: Flame, label: "Sequência", value: "12", tone: "bg-orange-500" },
          { icon: Scale, label: "Peso", value: "78 kg", hint: "−1,2", tone: "bg-emerald-500" },
          { icon: CalendarCheck, label: "Este mês", value: "14", tone: "bg-sky-500" },
          { icon: Trophy, label: "Levantado", value: "307 t", tone: "bg-violet-500" },
        ].map(({ icon: Icon, label, value, hint, tone }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
            <p className="flex items-center gap-1 text-[8px] text-white/55">
              <span className={cn("grid size-3.5 place-items-center rounded", tone)}>
                <Icon className="size-2" />
              </span>
              {label}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">
              {value} {hint ? <span className="text-[8px] font-semibold text-emerald-400">{hint}</span> : null}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-7 gap-1">
        {WEEK.map(({ day, date, state }, index) => (
          <div key={index} className="flex flex-col items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] py-1">
            <span className="text-[7px] text-white/40">{day}</span>
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full text-[8px] font-semibold",
                state === "done" && "bg-emerald-500",
                state === "today" && "bg-violet-600 ring-2 ring-violet-300/40",
                state === "plan" && "bg-violet-500/25",
                state === "rest" && "text-white/30",
              )}
            >
              {state === "done" ? <Check className="size-2.5" strokeWidth={3} /> : date}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
        <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-violet-300">Treino de hoje</p>
        <p className="mt-0.5 text-xs font-semibold">Peito, ombros e tríceps</p>
        <div className="mt-1.5 flex items-center justify-between text-[8px] text-white/50">
          <span>7/12 séries</span>
          <span>2.340 kg de volume</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[58%] rounded-full bg-violet-500" />
        </div>
        {[
          ["Supino reto com barra", "4 × 8 · 60 kg", true],
          ["Desenvolvimento", "3 × 10 · 18 kg", false],
        ].map(([name, dose, done]) => (
          <div key={name as string} className="mt-1.5 flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5">
            <span className={cn("grid size-4 place-items-center rounded-md text-[8px]", done ? "bg-emerald-500" : "bg-violet-500/20 text-violet-200")}>
              {done ? <Check className="size-2.5" strokeWidth={3} /> : "2"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[9px] font-medium">{name as string}</span>
              <span className="block text-[8px] text-white/45">{dose as string}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TREINOS_POINTS = [
  { icon: Dumbbell, title: "Plano montado para você", body: "Pelo objetivo, local, dias e tempo. Ou escolha Push/Pull/Legs, Superior/Inferior, Corpo todo e 5×5." },
  { icon: Repeat, title: "Rodízio", body: "O próximo treino é o que vem depois do último feito, não importa o dia." },
  { icon: Check, title: "Séries completas", body: "Aquecimento, drop set, até a falha, RIR e bi-set, com descanso que avisa." },
  { icon: Disc3, title: "Calculadora de anilhas", body: "Mostra o que colocar de cada lado da barra." },
  { icon: Activity, title: "Mapa muscular", body: "Onde foi o volume da semana, o que está recuperando e o que ficou esquecido." },
  { icon: Trophy, title: "Recordes e progresso", body: "Sugestão de carga, máximo estimado, peso corporal com meta e o ano em quadradinhos." },
  { icon: Upload, title: "Traga seu histórico", body: "Importe do Strong ou do Hevy e exporte em planilha quando quiser." },
];

export function TreinosPoints() {
  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
      {TREINOS_POINTS.map(({ icon: Icon, title, body }) => (
        <li key={title} className={cn(styles.chip3d, "flex gap-3 rounded-2xl p-3.5")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-[color:var(--violet-hot)]">
            <Icon className="size-[18px]" />
          </span>
          <span>
            <span className="block text-sm font-semibold">{title}</span>
            <span className="mt-0.5 block text-[13px] leading-5 text-[color:var(--muted)]">{body}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const ACCOUNTS = [
  { name: "Pessoal", color: "#a78bfa" },
  { name: "Trabalho", color: "#38bdf8" },
  { name: "Faculdade", color: "#34d399" },
];

/** A month with holidays, Google events from three accounts and the tasks. */
export function AgendaCard() {
  const days = Array.from({ length: 35 }, (_, index) => index - 2);
  const events: Record<number, string> = { 4: "#a78bfa", 9: "#38bdf8", 12: "#34d399", 17: "#a78bfa", 19: "#38bdf8", 24: "#34d399" };
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-[#100c1e]/90 p-4 text-left shadow-[0_50px_90px_-30px_rgb(76_29_149/0.7)] backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="font-[family-name:var(--font-display)] text-lg font-bold">Novembro</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-white/60">
          <CalendarDays className="size-3" /> 3 contas Google
        </span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px]">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((letter, index) => (
          <span key={index} className="text-white/35">
            {letter}
          </span>
        ))}
        {days.map((day) => {
          const valid = day >= 1 && day <= 30;
          const holiday = day === 15 || day === 20;
          const today = day === 23;
          return (
            <span
              key={day}
              className={cn(
                "relative grid aspect-square place-items-center rounded-lg",
                !valid && "opacity-0",
                today && "bg-violet-600 font-bold text-white",
                holiday && !today && "text-amber-300",
                valid && !today && !holiday && "text-white/70",
              )}
            >
              {valid ? day : ""}
              {events[day] ? (
                <span className="absolute bottom-0.5 size-1 rounded-full" style={{ backgroundColor: events[day] }} />
              ) : null}
            </span>
          );
        })}
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          ["09:00", "Reunião de planejamento", "#38bdf8"],
          ["15:00", "Entregar relatório", "#a78bfa"],
          ["Feriado", "Dia da Consciência Negra", "#fbbf24"],
        ].map(([time, title, color]) => (
          <div key={title} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2 text-xs">
            <span className="h-6 w-1 rounded-full" style={{ backgroundColor: color }} />
            <span className="w-12 shrink-0 text-white/45">{time}</span>
            <span className="truncate">{title}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ACCOUNTS.map((account) => (
          <span key={account.name} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-white/70">
            <span className="size-2 rounded-full" style={{ backgroundColor: account.color }} />
            {account.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export const AGENDA_POINTS = [
  { icon: Link2, text: "Conecte o Google Agenda e o Google Tarefas com um toque, sem copiar links." },
  { icon: CalendarDays, text: "Até 3 contas Google juntas, cada uma com sua cor, e você escolhe quais agendas aparecem." },
  { icon: Flame, text: "Feriados nacionais já no calendário, ao lado das suas tarefas." },
  { icon: GraduationCap, text: "Grade de aulas da semana para quem estuda." },
];
