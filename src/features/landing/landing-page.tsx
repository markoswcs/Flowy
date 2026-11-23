import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  Dumbbell,
  Flame,
  GraduationCap,
  Hand,
  Folder,
  Home,
  Lock,
  Mic,
  Moon,
  Network,
  NotebookPen,
  PenTool,
  Plus,
  RefreshCw,
  Repeat2,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  WifiOff,
  Workflow,
} from "lucide-react";
import { Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { GoogleOneTap } from "@/components/auth/google-one-tap";
import { LandingMotion } from "@/features/landing/landing-motion";
import {
  AGENDA_POINTS,
  AgendaCard,
  Phone,
  TreinosPoints,
  TreinosScreen,
} from "@/features/landing/landing-showcase";
import { cn } from "@/lib/utils";

import styles from "./landing.module.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-display",
});
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif",
});

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;
const depth = (value: number) => ({ "--depth": value }) as CSSProperties;

function Reveal({
  children,
  className,
  wait = 0,
}: {
  children: ReactNode;
  className?: string;
  wait?: number;
}) {
  return (
    <div
      data-reveal
      className={cn(styles.reveal, className)}
      style={delay(wait)}
    >
      {children}
    </div>
  );
}

function DisplayHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        styles.display,
        "font-[family-name:var(--font-display)] text-3xl font-bold sm:text-5xl",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--violet-hot)]">
      {children}
    </p>
  );
}

const mockTasks = [
  { title: "Enviar proposta para o cliente", when: "Hoje · 14:00", tone: "today", folder: ["Trabalho", "#a78bfa"], done: true },
  { title: "Revisar o contrato da Maria", when: "Hoje · 16:30", tone: "today", folder: ["Trabalho", "#a78bfa"], done: false },
  { title: "Estudar inglês", when: "Hoje", tone: "today", repeat: "Dias úteis", folder: ["Pessoal", "#4ade80"], done: false },
  { title: "Planejar a campanha de novembro", when: "Sex", tone: "later", folder: ["Trabalho", "#a78bfa"], done: false },
];

// The home screen as it is today: sidebar, greeting with the calendar button,
// Hoje / Próximas / Todas, search with voice and filters, the streak and the tasks.
function AppMock() {
  return (
    <div className="flex h-full overflow-hidden rounded-[1.4rem] bg-[#111111] text-left">
      <aside className="hidden w-48 shrink-0 flex-col border-r border-white/[0.06] bg-[#151515] p-3 sm:flex">
        <div className="mb-5 flex items-center gap-2 px-2 pt-1">
          <Image src="/logo.png" alt="" width={20} height={20} />
          <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight">Flowy</span>
        </div>
        {[
          { label: "Início", icon: Home },
          { label: "Notas", icon: NotebookPen },
          { label: "Mapas", icon: Network },
          { label: "Desenhos", icon: PenTool },
          { label: "Treinos", icon: Dumbbell },
        ].map(({ label, icon: Icon }, index) => (
          <div
            key={label}
            className={cn(
              "mb-0.5 flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-xs",
              index === 0 ? "bg-white/[0.06] font-medium text-white" : "text-white/55",
            )}
          >
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full",
                index === 0 && "bg-[#18181d] shadow-[0_0_0_1.5px_rgb(167_139_250/0.8),0_0_10px_rgb(167_139_250/0.45)]",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            {label}
          </div>
        ))}
        <p className="mb-1.5 mt-5 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Pastas</p>
        {[
          ["Trabalho", "#a78bfa", 2],
          ["Pessoal", "#4ade80", 1],
        ].map(([name, color, count]) => (
          <div key={name as string} className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-white/60">
            <Folder className="size-3.5" style={{ color: color as string }} />
            <span className="flex-1">{name}</span>
            <span className="rounded-full bg-white/[0.07] px-1.5 text-[9px]">{count}</span>
          </div>
        ))}
      </aside>

      <div className="relative min-w-0 flex-1 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500">
                <Sun className="size-4 text-white" />
              </span>
              <p className="truncate font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">
                Boa tarde, Ana
              </p>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[10px] text-white/55">
              <Sparkles className="size-3" /> 3 tarefas para hoje. Comece por “Revisar o contrato da Maria”.
            </p>
          </div>
          <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
            <CalendarDays className="size-3.5 text-white/70" />
          </span>
        </div>

        <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-0.5 text-[10px] text-white/55">
          {["Hoje", "Próximas", "Todas"].map((item, index) => (
            <span key={item} className={cn("rounded-lg px-4 py-1", index === 0 && "border border-white/15 bg-[#1b1b1b] font-semibold text-white")}>
              {item}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-white/75">
          <Search className="size-3.5 shrink-0 text-white/40" />
          <span className="min-w-0 flex-1 truncate">
            <span className={cn(styles.typing, "inline-block max-w-full align-bottom")}>Reunião com o time amanhã às 15h</span>
          </span>
          <Mic className="size-3.5 shrink-0 text-white/40" />
          <span className="hidden items-center gap-1 text-white/55 sm:inline-flex">
            <SlidersHorizontal className="size-3" /> Filtros
          </span>
        </div>

        <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-white/60">
          <span className="grid size-5 place-items-center rounded-full bg-orange-500/15">
            <Flame className="size-3 text-orange-400" />
          </span>
          <strong className="text-white">12</strong> dias seguidos
        </p>

        <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">
          Hoje <span className="rounded-full bg-white/[0.08] px-1.5 tracking-normal">3</span>
        </p>
        <div className="space-y-1.5">
          {mockTasks.map((task, index) => (
            <div
              key={task.title}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-[#161616] px-3 py-2",
                index === mockTasks.length - 1 && "hidden sm:flex",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2",
                  task.done ? "border-transparent bg-violet-600" : "border-violet-400/60 bg-violet-500/10",
                )}
              >
                {task.done ? <Check className="size-2.5 text-white" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-xs font-medium", task.done && "text-white/40 line-through")}>{task.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1 text-[9px]">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5",
                      task.tone === "today" && !task.done ? "bg-violet-500/20 text-violet-200 ring-1 ring-inset ring-violet-400/35" : "text-white/45",
                    )}
                  >
                    <CalendarDays className="size-2.5" />
                    {task.when}
                  </span>
                  {task.repeat ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-sky-400">
                      <Repeat2 className="size-2.5" /> {task.repeat}
                    </span>
                  ) : null}
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-white/75"
                    style={{ backgroundColor: `${task.folder[1]}22` }}
                  >
                    <Folder className="size-2.5" style={{ color: task.folder[1] }} /> {task.folder[0]}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <span className="absolute bottom-4 right-4 grid size-11 place-items-center rounded-2xl bg-violet-600 shadow-[0_10px_30px_-8px_rgb(124_58_237/0.9)]">
          <Plus className="size-5 text-white" />
        </span>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Mic,
    title: "Escreva ou fale como você fala",
    body: "O Flowy separa título e detalhes e entende data, período, pasta e prioridade. Você só confere e salva.",
    span: "md:col-span-2",
    art: (
      <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white/70">
          “Preciso mandar o relatório pro João amanhã de manhã, porque ele vai
          conferir a campanha.”
        </div>
        <ArrowRight className="mx-auto hidden size-4 text-white/30 sm:block" />
        <div className="space-y-1.5 rounded-2xl bg-violet-500/12 px-4 py-3 text-sm text-violet-50">
          <p className="font-semibold">Enviar relatório para João</p>
          <p className="text-xs text-white/60">Ele vai conferir a campanha.</p>
          <p className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-white/70">
            <span className="rounded-md border border-white/10 px-1.5 py-0.5">
              Amanhã · manhã
            </span>
            <span className="rounded-md border border-white/10 px-1.5 py-0.5">
              Trabalho
            </span>
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: CalendarDays,
    title: "Calendário com feriados",
    body: "Veja o mês, os feriados e a agenda do seu e-mail junto com as tarefas.",
    span: "",
    art: (
      <div className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px] text-white/60">
        {Array.from({ length: 14 }, (_, index) => (
          <span
            key={index}
            className={
              index === 9
                ? "rounded-full bg-violet-500 py-1 font-semibold text-white"
                : index === 4
                  ? "py-1 text-amber-300"
                  : "py-1"
            }
          >
            {index + 10}
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: Workflow,
    title: "Mapas mentais e desenhos",
    body: "Conecte ideias em um mapa ou rabisque um fluxograma livre.",
    span: "",
    art: (
      <svg viewBox="0 0 220 100" className="mt-6 w-full" aria-hidden="true">
        <g stroke="rgb(167 139 250 / 0.7)" strokeWidth="1.5" fill="none">
          <path className={styles.mindLine} d="M110 50 C 80 50, 70 18, 42 18" />
          <path className={styles.mindLine} d="M110 50 C 80 50, 70 82, 42 82" />
          <path
            className={styles.mindLine}
            d="M110 50 C 140 50, 150 18, 178 18"
          />
          <path
            className={styles.mindLine}
            d="M110 50 C 140 50, 150 82, 178 82"
          />
        </g>
        <rect x="80" y="37" width="60" height="26" rx="13" fill="#7c3aed" />
        <text x="110" y="54" textAnchor="middle" fontSize="10" fill="white">
          Projeto
        </text>
        {[
          [42, 18, "Prazo"],
          [42, 82, "Equipe"],
          [178, 18, "Ideias"],
          [178, 82, "Custos"],
        ].map(([x, y, label]) => (
          <g key={label as string}>
            <rect
              x={(x as number) - 24}
              y={(y as number) - 9}
              width="48"
              height="18"
              rx="9"
              fill="rgb(255 255 255 / 0.08)"
            />
            <text
              x={x as number}
              y={(y as number) + 3.5}
              textAnchor="middle"
              fontSize="8"
              fill="rgb(255 255 255 / 0.65)"
            >
              {label}
            </text>
          </g>
        ))}
      </svg>
    ),
  },
  {
    icon: NotebookPen,
    title: "Notas que se salvam sozinhas",
    body: "Listas de verificação, imagens e formatação, salvas enquanto você escreve.",
    span: "",
    art: (
      <div className="mt-6 space-y-2.5 rounded-2xl bg-white/[0.04] p-4 text-xs text-white/65">
        <p className="font-semibold text-white/85">Viagem de fim de ano</p>
        <p className="flex items-center gap-2">
          <span className="grid size-3.5 place-items-center rounded bg-emerald-500">
            <Check className="size-2.5 text-white" strokeWidth={3} />
          </span>
          Reservar hotel
        </p>
        <p className="flex items-center gap-2">
          <span className="size-3.5 rounded border border-white/30" /> Comprar
          passagens
        </p>
      </div>
    ),
  },
  {
    icon: Bell,
    title: "Lembretes no celular e no PC",
    body: "Notificações no horário da tarefa, mesmo com o Flowy fechado.",
    span: "",
    art: (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <span
          className={cn(
            styles.ring,
            "grid size-9 place-items-center rounded-xl bg-violet-500/25 text-violet-200",
          )}
        >
          <Bell className="size-4" />
        </span>
        <div className="min-w-0 text-xs">
          <p className="truncate font-semibold">Revisar o contrato da Maria</p>
          <p className="text-white/45">Agora · Flowy</p>
        </div>
      </div>
    ),
  },
  {
    icon: Flame,
    title: "Dias seguidos com proteção",
    body: "Sua sequência cresce a cada dia e um dia de folga guardado segura ela quando a vida aperta.",
    span: "",
    art: (
      <div className="mt-6 flex items-end justify-between gap-1">
        {[3, 5, 4, 6, 7, 5, 8].map((height, index) => (
          <span
            key={index}
            className={cn(
              "w-full rounded-md",
              index === 5
                ? "bg-sky-400/70"
                : "bg-gradient-to-t from-orange-600 to-amber-400",
            )}
            style={{ height: height * 7 }}
            title={index === 5 ? "Dia protegido" : undefined}
          />
        ))}
      </div>
    ),
  },
  {
    icon: GraduationCap,
    title: "Grade de aulas",
    body: "A semana da faculdade ou da escola, com sala e horário, à mão no celular.",
    span: "",
    art: (
      <div className="mt-6 grid grid-cols-3 gap-1.5 text-[10px]">
        {[
          ["Seg", "Cálculo", "bg-violet-500/25"],
          ["Ter", "Física", "bg-sky-500/25"],
          ["Qua", "Cálculo", "bg-violet-500/25"],
          ["Qui", "Química", "bg-emerald-500/25"],
          ["Sex", "Física", "bg-sky-500/25"],
          ["Sex", "Inglês", "bg-amber-500/25"],
        ].map(([day, name, tone], index) => (
          <span key={index} className={cn("rounded-lg px-2 py-1.5", tone)}>
            <span className="block text-white/45">{day}</span>
            <span className="font-medium">{name}</span>
          </span>
        ))}
      </div>
    ),
  },
  {
    icon: Hand,
    title: "Do seu jeito no celular",
    body: "Segure um botão da barra de baixo e troque o atalho. Escolha também qual aba abre primeiro.",
    span: "",
    art: (
      <div className="mt-6 flex items-center justify-around rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
        {[Home, NotebookPen, Dumbbell, GraduationCap].map((Icon, index) => (
          <span
            key={index}
            className={cn(
              "grid size-9 place-items-center rounded-xl",
              index === 2
                ? "bg-violet-500/30 text-white ring-1 ring-violet-300/50"
                : "text-white/50",
            )}
          >
            <Icon className="size-4" />
          </span>
        ))}
      </div>
    ),
  },
];

const benefits = [
  {
    icon: Sparkles,
    title: "Organiza enquanto você digita",
    body: "Sugere pasta e etiquetas pelo que você já costuma usar.",
  },
  {
    icon: RefreshCw,
    title: "Sincroniza entre aparelhos",
    body: "Comece no computador e termine no celular.",
  },
  {
    icon: Smartphone,
    title: "Instala como app",
    body: "No celular ou no PC, direto do navegador, e atualiza com um toque.",
  },
  {
    icon: WifiOff,
    title: "Funciona com internet ruim",
    body: "Avisa quando fica offline e sincroniza quando a conexão volta.",
  },
  {
    icon: Lock,
    title: "Seus dados são só seus",
    body: "Cada conta vê apenas o próprio conteúdo.",
  },
  {
    icon: Moon,
    title: "Temas escuro, OLED e claro",
    body: "Com opção de reduzir animações.",
  },
];

export function LandingPage() {
  return (
    <LandingMotion>
      <div className={cn(styles.page, display.variable, serif.variable)}>
        <GoogleOneTap />
        <div className={styles.aurora} aria-hidden="true" />

        <header className={styles.nav}>
          <nav
            className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"
            aria-label="Principal"
          >
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Image
                src="/logo.png"
                alt=""
                width={30}
                height={30}
                className="rounded-lg"
                priority
              />
              <span className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                Flowy
              </span>
            </Link>
            <div className="hidden items-center gap-7 text-sm text-[color:var(--muted)] md:flex">
              <a
                href="#recursos"
                className="transition-colors hover:text-white"
              >
                Recursos
              </a>
              <a href="#treinos" className="transition-colors hover:text-white">
                Treinos
              </a>
              <a href="#agenda" className="transition-colors hover:text-white">
                Agenda
              </a>
              <a href="#por-que" className="transition-colors hover:text-white">
                Por que o Flowy
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={cn(
                  styles.ctaGhost,
                  "rounded-full px-4 py-2 text-sm font-medium",
                )}
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className={cn(
                  styles.ctaPrimary,
                  "hidden rounded-full px-4 py-2 text-sm font-semibold text-white sm:inline-flex",
                )}
              >
                Criar conta
              </Link>
            </div>
          </nav>
        </header>

        <main>
          <section className="relative px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20">
            <div className={styles.gridFloor} aria-hidden="true" />
            <div className="relative mx-auto max-w-3xl">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-[color:var(--muted)]">
                  Tarefas · Agenda · Treinos · Notas · Mapas
                </span>
              </Reveal>
              <Reveal wait={80}>
                <h1
                  className={cn(
                    styles.display,
                    "mt-6 font-[family-name:var(--font-display)] text-[2.6rem] font-extrabold sm:text-6xl md:text-7xl",
                  )}
                >
                  Sua rotina inteira,{" "}
                  <span
                    className={cn(
                      styles.serif,
                      "font-[family-name:var(--font-serif)] font-normal",
                    )}
                  >
                    num só lugar.
                  </span>
                </h1>
              </Reveal>
              <Reveal wait={160}>
                <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-[color:var(--muted)] sm:text-lg">
                  Tarefas que se organizam sozinhas, sua agenda do Google,
                  treinos com progresso, notas e mapas mentais. No celular e no
                  computador, e lembra você na hora certa.
                </p>
              </Reveal>
              <Reveal
                wait={240}
                className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Link
                  href="/cadastro"
                  className={cn(
                    styles.ctaPrimary,
                    "inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white",
                  )}
                >
                  Começar grátis <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    styles.ctaGhost,
                    "inline-flex h-12 items-center rounded-full px-7 text-sm font-medium",
                  )}
                >
                  Já tenho conta
                </Link>
              </Reveal>
            </div>

            <Reveal
              wait={320}
              className={cn(
                styles.stage,
                "relative mx-auto mt-14 max-w-5xl sm:mt-16",
              )}
            >
              <div className={cn(styles.stage3d, "relative")}>
                <div
                  className={cn(
                    styles.device,
                    "relative h-[440px] sm:h-[500px]",
                  )}
                >
                  <div
                    className={cn(
                      styles.deviceGlare,
                      "pointer-events-none absolute inset-0 rounded-[1.5rem]",
                    )}
                  />
                  <AppMock />

                  {/* Floating cards sit on the frame's edges, never over the content. */}
                  <div
                    className={cn(
                      styles.float,
                      "-left-8 top-20 hidden w-56 p-3 text-left lg:block",
                    )}
                    style={depth(1.4)}
                  >
                    <div
                      className={cn(styles.bob, "flex items-center gap-2.5")}
                    >
                      <span
                        className={cn(
                          styles.ring,
                          "grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/25",
                        )}
                      >
                        <Bell className="size-4 text-violet-200" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold">Lembrete</p>
                        <p className="truncate text-[11px] text-white/55">
                          Revisar o contrato · 16:30
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      styles.float,
                      "-left-6 bottom-12 hidden w-52 p-3 text-left lg:block",
                    )}
                    style={depth(1)}
                  >
                    <div
                      className={styles.bob}
                      style={{ animationDelay: "-3s" }}
                    >
                      <p className="text-[10px] uppercase tracking-widest text-white/40">
                        Criada agora
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        Reunião com o time
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-violet-200">
                        <CalendarDays className="size-3.5" /> Amanhã às 15:00
                      </p>
                    </div>
                  </div>
                </div>
                {/* The phone stands in front of the computer, closer to you. */}
                <Phone
                  className={cn(
                    styles.lifted,
                    "absolute -bottom-12 -right-6 hidden h-[440px] w-[214px] lg:block",
                  )}
                >
                  <TreinosScreen />
                </Phone>
              </div>
            </Reveal>
          </section>

          <section
            id="recursos"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
          >
            <Reveal className="max-w-2xl">
              <Eyebrow>Recursos</Eyebrow>
              <DisplayHeading className="mt-3">
                Tudo em um lugar.{" "}
                <span className="text-[color:var(--muted)]">
                  Sem complicar.
                </span>
              </DisplayHeading>
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, title, body, span, art }, index) => (
                <Reveal key={title} wait={(index % 3) * 80} className={span}>
                  <article
                    data-tilt
                    className={cn(
                      styles.card,
                      styles.tilt,
                      "relative h-full p-6",
                    )}
                  >
                    <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15 text-[color:var(--violet-hot)]">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                      {body}
                    </p>
                    <div className={styles.cardArt}>{art}</div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section
            id="treinos"
            className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
          >
            <div
              className={cn(
                styles.orb,
                "-left-20 top-10 size-72 bg-violet-600/25",
              )}
              aria-hidden="true"
            />
            <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
              <Reveal>
                <Eyebrow>Treinos</Eyebrow>
                <DisplayHeading className="mt-3">
                  Sua academia,{" "}
                  <span
                    className={cn(
                      styles.serif,
                      "font-[family-name:var(--font-serif)] font-normal",
                    )}
                  >
                    no bolso.
                  </span>
                </DisplayHeading>
                <p className="mt-4 max-w-lg text-[color:var(--muted)]">
                  Um plano feito para você, cada série anotada em segundos e o
                  progresso que dá vontade de voltar amanhã.
                </p>
                <TreinosPoints />
              </Reveal>
              <Reveal
                wait={120}
                className={cn(styles.stage, "flex justify-center")}
              >
                <Phone className={cn(styles.turn, "h-[560px] w-[272px]")}>
                  <TreinosScreen />
                </Phone>
              </Reveal>
            </div>
          </section>

          <section
            id="agenda"
            className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24"
          >
            <div
              className={cn(
                styles.orb,
                "-right-16 top-20 size-72 bg-sky-500/15",
              )}
              aria-hidden="true"
            />
            <div className="relative grid items-center gap-12 lg:grid-cols-2">
              <Reveal className={cn(styles.stage, "order-2 lg:order-1")}>
                <div
                  data-tilt
                  className={cn(
                    styles.tilt,
                    "relative mx-auto max-w-md rounded-[1.6rem]",
                  )}
                >
                  <AgendaCard />
                </div>
              </Reveal>
              <Reveal wait={120} className="order-1 lg:order-2">
                <Eyebrow>Agenda</Eyebrow>
                <DisplayHeading className="mt-3">
                  Tudo do seu dia, junto.
                </DisplayHeading>
                <p className="mt-4 max-w-lg text-[color:var(--muted)]">
                  Reuniões, tarefas, feriados e aulas no mesmo calendário, com
                  um botãozinho ao lado do seu bom-dia.
                </p>
                <ul className="mt-7 space-y-3">
                  {AGENDA_POINTS.map(({ icon: Icon, text }) => (
                    <li
                      key={text}
                      className="flex items-start gap-3 text-sm leading-6"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-[color:var(--violet-hot)]">
                        <Icon className="size-4" />
                      </span>
                      <span className="pt-1 text-white/80">{text}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </section>

          <section
            id="por-que"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24"
          >
            <Reveal className="max-w-2xl">
              <Eyebrow>Por que o Flowy</Eyebrow>
              <DisplayHeading className="mt-3">
                Feito para o dia a dia.
              </DisplayHeading>
            </Reveal>
            <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map(({ icon: Icon, title, body }, index) => (
                <Reveal key={title} wait={(index % 3) * 80}>
                  <li className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-[color:var(--violet-hot)]">
                      <Icon className="size-[18px]" />
                    </span>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                        {body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>

          <section className="px-4 pb-20 sm:px-6">
            <Reveal
              className={cn(
                styles.ctaBox,
                "relative isolate mx-auto max-w-4xl overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:py-16",
              )}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(55%_80%_at_50%_0%,rgb(124_58_237/0.45),transparent_70%)]"
              />
              <div
                aria-hidden="true"
                className={cn(styles.ctaGrid, "absolute inset-0 -z-10")}
              />
              <DisplayHeading className="mx-auto max-w-xl">
                Comece hoje,{" "}
                <span
                  className={cn(
                    styles.serif,
                    "font-[family-name:var(--font-serif)] font-normal",
                  )}
                >
                  sem custo.
                </span>
              </DisplayHeading>
              <p className="mx-auto mt-4 max-w-md text-[color:var(--muted)]">
                Crie sua conta em menos de um minuto. Um tour rápido mostra o
                essencial.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/cadastro"
                  className={cn(
                    styles.ctaPrimary,
                    "inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm font-semibold text-white",
                  )}
                >
                  Criar minha conta <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    styles.ctaGhost,
                    "inline-flex h-12 items-center rounded-full px-8 text-sm font-medium",
                  )}
                >
                  Entrar
                </Link>
              </div>
            </Reveal>
          </section>
        </main>

        <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-[color:var(--muted)] sm:px-6">
          <nav
            className="mb-3 flex justify-center gap-4"
            aria-label="Informações"
          >
            <Link href="/privacidade" className="hover:text-white">
              Política de privacidade
            </Link>
            <Link href="/termos" className="hover:text-white">
              Termos de uso
            </Link>
            <Link href="/instalar" className="hover:text-white">
              Como instalar
            </Link>
          </nav>
          © {new Date().getFullYear()} Flowy
        </footer>
      </div>
    </LandingMotion>
  );
}
