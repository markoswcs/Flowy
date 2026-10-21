import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  Columns3,
  Folder,
  Grid2x2,
  Home,
  LayoutList,
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
    <div data-reveal className={cn(styles.reveal, className)} style={delay(wait)}>
      {children}
    </div>
  );
}

function DisplayHeading({ children, className }: { children: ReactNode; className?: string }) {
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

// The home screen as it really is: same navigation, tabs, search bar and
// task chips, with sample tasks.
const mockTasks = [
  { title: "Enviar proposta para o cliente", when: "Hoje · 14:00", folder: "Trabalho", done: true },
  { title: "Revisar o contrato da Maria", when: "Hoje · 16:30", folder: "Trabalho", done: false },
  { title: "Academia", when: "Amanhã · 07:00", folder: "Pessoal", repeat: true, done: false },
  { title: "Planejar a campanha de novembro", when: "Sex", folder: "Trabalho", done: false },
];

function AppMock() {
  return (
    <div className="flex h-full overflow-hidden rounded-[1.4rem] text-left">
      <aside className="hidden w-48 shrink-0 flex-col border-r border-white/5 bg-white/[0.02] p-3 sm:flex">
        <div className="mb-5 flex items-center gap-2 px-2 pt-1 text-sm font-semibold">
          <Image src="/logo.png" alt="" width={22} height={22} className="rounded-md" />
          Flowy
        </div>
        {[
          { label: "Início", icon: Home },
          { label: "Notas", icon: NotebookPen },
          { label: "Mapas", icon: Network },
          { label: "Desenhos", icon: PenTool },
        ].map(({ label, icon: Icon }, index) => (
          <div
            key={label}
            className={cn(
              "mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs",
              index === 0 ? styles.mockActive : "text-white/50",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </div>
        ))}
        <p className="mb-1.5 mt-5 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
          Pastas
        </p>
        {[
          ["Trabalho", "#a78bfa"],
          ["Pessoal", "#4ade80"],
        ].map(([name, color]) => (
          <div key={name} className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-white/50">
            <Folder className="size-3.5" style={{ color }} /> {name}
          </div>
        ))}
      </aside>

      <div className="relative min-w-0 flex-1 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600">
              <Sun className="size-4 text-white" />
            </span>
            <p className="truncate font-[family-name:var(--font-display)] text-lg font-bold tracking-tight sm:text-xl">
              Boa tarde, Ana
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-0.5 rounded-full border border-white/10 p-0.5 text-[10px] text-white/50 md:flex">
            <span className={cn(styles.mockActive, "flex items-center gap-1 rounded-full px-2 py-1")}>
              <LayoutList className="size-3" /> Lista
            </span>
            <span className="flex items-center gap-1 px-2 py-1">
              <Columns3 className="size-3" /> Kanban
            </span>
            <span className="flex items-center gap-1 px-2 py-1">
              <Grid2x2 className="size-3" /> Matriz
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-1 text-[10px] text-white/45">
          {["Todas", "Hoje", "Atrasadas", "Próximas", "Concluídas"].map((item, index) => (
            <span
              key={item}
              className={cn(
                "rounded-full px-2.5 py-1",
                index === 0 && cn(styles.mockActive, "text-white"),
                index === 2 || index === 4 ? "hidden sm:inline" : "",
              )}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-[11px] text-white/75">
          <Search className="size-3.5 shrink-0 text-white/40" />
          <span className="min-w-0 flex-1 truncate">
            <span className={cn(styles.typing, "inline-block max-w-full align-bottom")}>
              Reunião com o time amanhã às 15h
            </span>
          </span>
          <Mic className="size-3.5 shrink-0 text-white/40" />
        </div>

        <p className="mb-2 mt-4 text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">Hoje</p>
        <div className="space-y-2">
          {mockTasks.map((task, index) => (
            <div
              key={task.title}
              className={cn(
                "flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2.5",
                // On phones the last one would sit under the "+" button.
                index === mockTasks.length - 1 && "hidden sm:flex",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2",
                  task.done ? "border-violet-500 bg-violet-500" : "border-white/30",
                )}
              >
                {task.done ? <Check className="size-2.5 text-white" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-xs font-medium", task.done && "text-white/40 line-through")}>
                  {task.title}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-white/45">
                  <span className="inline-flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-0.5">
                    <CalendarDays className="size-2.5" />
                    {task.when}
                  </span>
                  {task.repeat ? (
                    <span className="inline-flex items-center gap-1">
                      <Repeat2 className="size-2.5" /> Diariamente
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1">
                    <Folder className="size-2.5" /> {task.folder}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <span className="absolute bottom-4 right-4 grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_10px_30px_-8px_rgb(124_58_237/0.9)] sm:bottom-5 sm:right-5">
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
          “Preciso mandar o relatório pro João amanhã de manhã, porque ele vai conferir a campanha.”
        </div>
        <ArrowRight className="mx-auto hidden size-4 text-white/30 sm:block" />
        <div className="space-y-1.5 rounded-2xl bg-violet-500/12 px-4 py-3 text-sm text-violet-50">
          <p className="font-semibold">Enviar relatório para João</p>
          <p className="text-xs text-white/60">Ele vai conferir a campanha.</p>
          <p className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-white/70">
            <span className="rounded-md border border-white/10 px-1.5 py-0.5">Amanhã · manhã</span>
            <span className="rounded-md border border-white/10 px-1.5 py-0.5">Trabalho</span>
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: Columns3,
    title: "Lista, Kanban e Matriz",
    body: "O mesmo trabalho, visto do jeito que fizer sentido agora.",
    span: "",
    art: (
      <div className="mt-6 grid grid-cols-3 gap-2">
        {["A fazer", "Fazendo", "Feito"].map((column, index) => (
          <div key={column} className="rounded-xl bg-white/[0.03] p-2">
            <p className="mb-2 truncate text-[9px] uppercase tracking-widest text-white/40">{column}</p>
            {index === 0 ? <div className={cn(styles.kanbanCard, "h-6 rounded-md bg-violet-400/40")} /> : null}
            <div className="mt-1.5 h-6 rounded-md bg-white/10" />
          </div>
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
          <path className={styles.mindLine} d="M110 50 C 140 50, 150 18, 178 18" />
          <path className={styles.mindLine} d="M110 50 C 140 50, 150 82, 178 82" />
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
            <rect x={(x as number) - 24} y={(y as number) - 9} width="48" height="18" rx="9" fill="rgb(255 255 255 / 0.08)" />
            <text x={x as number} y={(y as number) + 3.5} textAnchor="middle" fontSize="8" fill="rgb(255 255 255 / 0.65)">
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
          <span className="size-3.5 rounded border border-white/30" /> Comprar passagens
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
        <span className={cn(styles.ring, "grid size-9 place-items-center rounded-xl bg-violet-500/25 text-violet-200")}>
          <Bell className="size-4" />
        </span>
        <div className="min-w-0 text-xs">
          <p className="truncate font-semibold">Revisar o contrato da Maria</p>
          <p className="text-white/45">Agora · Flowy</p>
        </div>
      </div>
    ),
  },
];

const benefits = [
  { icon: Sparkles, title: "Organiza enquanto você digita", body: "Sugere pasta e etiquetas pelo que você já costuma usar." },
  { icon: RefreshCw, title: "Sincroniza entre aparelhos", body: "Comece no computador e termine no celular." },
  { icon: Smartphone, title: "Instala como app", body: "No celular ou no PC, direto do navegador." },
  { icon: WifiOff, title: "Avisa quando fica offline", body: "E volta a sincronizar quando a conexão retorna." },
  { icon: Lock, title: "Seus dados são só seus", body: "Cada conta vê apenas o próprio conteúdo." },
  { icon: Moon, title: "Temas escuro, OLED e claro", body: "Com opção de reduzir animações." },
];

export function LandingPage() {
  return (
    <LandingMotion>
      <div className={cn(styles.page, display.variable, serif.variable)}>
        <GoogleOneTap />
        <div className={styles.aurora} aria-hidden="true" />

        <header className={styles.nav}>
          <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Principal">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Image src="/logo.png" alt="" width={30} height={30} className="rounded-lg" priority />
              <span className="font-[family-name:var(--font-display)] text-lg tracking-tight">Flowy</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm text-[color:var(--muted)] md:flex">
              <a href="#recursos" className="transition-colors hover:text-white">Recursos</a>
              <a href="#por-que" className="transition-colors hover:text-white">Por que o Flowy</a>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login" className={cn(styles.ctaGhost, "rounded-full px-4 py-2 text-sm font-medium")}>
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className={cn(styles.ctaPrimary, "hidden rounded-full px-4 py-2 text-sm font-semibold text-white sm:inline-flex")}
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
                  Tarefas · Notas · Mapas mentais · Desenhos
                </span>
              </Reveal>
              <Reveal wait={80}>
                <h1
                  className={cn(
                    styles.display,
                    "mt-6 font-[family-name:var(--font-display)] text-[2.6rem] font-extrabold sm:text-6xl md:text-7xl",
                  )}
                >
                  Suas tarefas e ideias,{" "}
                  <span className={cn(styles.serif, "font-[family-name:var(--font-serif)] font-normal")}>
                    no seu ritmo.
                  </span>
                </h1>
              </Reveal>
              <Reveal wait={160}>
                <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-[color:var(--muted)] sm:text-lg">
                  Escreva ou fale do seu jeito. O Flowy coloca data, pasta e prioridade, e
                  lembra você na hora certa.
                </p>
              </Reveal>
              <Reveal wait={240} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/cadastro"
                  className={cn(styles.ctaPrimary, "inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white")}
                >
                  Começar grátis <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className={cn(styles.ctaGhost, "inline-flex h-12 items-center rounded-full px-7 text-sm font-medium")}
                >
                  Já tenho conta
                </Link>
              </Reveal>
            </div>

            <Reveal wait={320} className="relative mx-auto mt-14 max-w-5xl sm:mt-16">
              <div className={cn(styles.device, "relative h-[440px] sm:h-[500px]")}>
                <div className={cn(styles.deviceGlare, "pointer-events-none absolute inset-0 rounded-[1.5rem]")} />
                <AppMock />

                {/* Floating cards sit on the frame's edges, never over the content. */}
                <div
                  className={cn(styles.float, "-bottom-6 right-24 hidden w-56 p-3 text-left lg:block")}
                  style={depth(1.4)}
                >
                  <div className={cn(styles.bob, "flex items-center gap-2.5")}>
                    <span className={cn(styles.ring, "grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/25")}>
                      <Bell className="size-4 text-violet-200" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">Lembrete</p>
                      <p className="truncate text-[11px] text-white/55">Revisar o contrato · 16:30</p>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(styles.float, "-left-6 bottom-12 hidden w-52 p-3 text-left lg:block")}
                  style={depth(1)}
                >
                  <div className={styles.bob} style={{ animationDelay: "-3s" }}>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Criada agora</p>
                    <p className="mt-1 text-sm font-semibold">Reunião com o time</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-violet-200">
                      <CalendarDays className="size-3.5" /> Amanhã às 15:00
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

          <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-24">
            <Reveal className="max-w-2xl">
              <Eyebrow>Recursos</Eyebrow>
              <DisplayHeading className="mt-3">
                Tudo em um lugar.{" "}
                <span className="text-[color:var(--muted)]">Sem complicar.</span>
              </DisplayHeading>
            </Reveal>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, title, body, span, art }, index) => (
                <Reveal key={title} wait={(index % 3) * 80} className={span}>
                  <article className={cn(styles.card, "h-full p-6")}>
                    <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15 text-[color:var(--violet-hot)]">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{body}</p>
                    <div className={styles.cardArt}>{art}</div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section id="por-que" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 sm:pb-24">
            <Reveal className="max-w-2xl">
              <Eyebrow>Por que o Flowy</Eyebrow>
              <DisplayHeading className="mt-3">Feito para o dia a dia.</DisplayHeading>
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
                      <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{body}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>

          <section className="px-4 pb-20 sm:px-6">
            <Reveal className={cn(styles.ctaBox, "relative isolate mx-auto max-w-4xl overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:py-16")}>
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[radial-gradient(55%_80%_at_50%_0%,rgb(124_58_237/0.45),transparent_70%)]"
              />
              <div aria-hidden="true" className={cn(styles.ctaGrid, "absolute inset-0 -z-10")} />
              <DisplayHeading className="mx-auto max-w-xl">
                Comece hoje,{" "}
                <span className={cn(styles.serif, "font-[family-name:var(--font-serif)] font-normal")}>sem custo.</span>
              </DisplayHeading>
              <p className="mx-auto mt-4 max-w-md text-[color:var(--muted)]">
                Crie sua conta em menos de um minuto. Um tour rápido mostra o essencial.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/cadastro"
                  className={cn(styles.ctaPrimary, "inline-flex h-12 items-center gap-2 rounded-full px-8 text-sm font-semibold text-white")}
                >
                  Criar minha conta <ArrowRight className="size-4" />
                </Link>
                <Link href="/login" className={cn(styles.ctaGhost, "inline-flex h-12 items-center rounded-full px-8 text-sm font-medium")}>
                  Entrar
                </Link>
              </div>
            </Reveal>
          </section>
        </main>

        <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-[color:var(--muted)] sm:px-6">
          © {new Date().getFullYear()} Flowy
        </footer>
      </div>
    </LandingMotion>
  );
}
