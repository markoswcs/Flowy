import {
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Columns3,
  Folder,
  Grid2x2,
  LayoutList,
  Lock,
  Moon,
  NotebookPen,
  Smartphone,
  Sparkles,
  Tag,
  Wand2,
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
        "font-[family-name:var(--font-display)] text-4xl font-bold sm:text-6xl",
        className,
      )}
    >
      {children}
    </h2>
  );
}

const mockTasks = [
  { title: "Enviar proposta para o cliente", meta: "Hoje · 14:00", tag: "Trabalho", color: "#a78bfa", done: true },
  { title: "Revisar fluxo de onboarding", meta: "Hoje · 16:30", tag: "Produto", color: "#67e8f9", done: false },
  { title: "Academia", meta: "Amanhã · 07:00", tag: "Pessoal", color: "#4ade80", done: false },
  { title: "Planejar campanha de novembro", meta: "Sex · 10:00", tag: "Marketing", color: "#fbbf24", done: false },
];

function AppMock() {
  return (
    <div className="flex h-full overflow-hidden rounded-[1.4rem] text-left">
      <aside className="hidden w-44 shrink-0 border-r border-white/5 bg-white/[0.02] p-4 sm:block">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold">
          <Image src="/logo.png" alt="" width={22} height={22} className="rounded-md" />
          Flowy
        </div>
        {["Início", "Notas", "Fluxogramas", "Mapas mentais"].map((item, index) => (
          <div
            key={item}
            className={cn(
              "mb-1 rounded-xl px-3 py-2 text-xs",
              index === 0 ? "bg-violet-500/15 text-violet-200" : "text-white/45",
            )}
          >
            {item}
          </div>
        ))}
        <p className="mb-2 mt-6 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
          Pastas
        </p>
        {["Trabalho", "Pessoal"].map((item) => (
          <div key={item} className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/45">
            <Folder className="size-3.5" /> {item}
          </div>
        ))}
      </aside>
      <div className="min-w-0 flex-1 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600">
            <Moon className="size-4 text-white" />
          </span>
          <p className="text-lg font-bold tracking-tight sm:text-xl">Boa noite, Ana</p>
        </div>
        <div className="mt-4 flex gap-1.5">
          {["Todas", "Hoje", "Próximas"].map((item, index) => (
            <span
              key={item}
              className={cn(
                "rounded-full px-3 py-1 text-[10px]",
                index === 1 ? "bg-violet-500/20 text-violet-200" : "text-white/40",
              )}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="mt-4 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-[11px] text-white/70">
          <span className={cn(styles.typing, "inline-block align-bottom")}>
            Reunião com o time amanhã 15h
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {mockTasks.map((task) => (
            <div
              key={task.title}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
            >
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border",
                  task.done ? "border-violet-400 bg-violet-500" : "border-white/25",
                )}
              >
                {task.done ? <Check className="size-2.5 text-white" /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-xs font-medium", task.done && "text-white/40 line-through")}>
                  {task.title}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-[10px] text-white/40">
                  {task.meta}
                  <span className="flex items-center gap-1" style={{ color: task.color }}>
                    <span className="size-1.5 rounded-full" style={{ background: task.color }} />
                    {task.tag}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: Wand2,
    title: "Escreva como você fala",
    body: "“Pagar boleto sexta 10h” vira uma tarefa com data e horário. Sem formulários.",
    span: "md:col-span-2",
    art: (
      <div className="mt-6 space-y-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
          Pagar boleto <span className="text-violet-300">sexta 10h</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-violet-500/15 px-4 py-3 text-sm text-violet-100">
          <CalendarClock className="size-4" /> Criar “Pagar boleto” · sexta às 10:00
        </div>
      </div>
    ),
  },
  {
    icon: Columns3,
    title: "Lista, Kanban e Matriz",
    body: "Veja o mesmo trabalho do jeito que sua cabeça pede no momento.",
    span: "",
    art: (
      <div className="mt-6 grid grid-cols-3 gap-2">
        {["A fazer", "Fazendo", "Feito"].map((column, index) => (
          <div key={column} className="rounded-xl bg-white/[0.03] p-2">
            <p className="mb-2 text-[9px] uppercase tracking-widest text-white/40">{column}</p>
            {index === 0 ? (
              <div className={cn(styles.kanbanCard, "h-6 rounded-md bg-violet-400/40")} />
            ) : null}
            <div className="mt-1.5 h-6 rounded-md bg-white/10" />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Workflow,
    title: "Mapas mentais e fluxogramas",
    body: "Desenhe ideias, conecte tópicos e transforme rabiscos em planos.",
    span: "",
    art: (
      <svg viewBox="0 0 220 110" className="mt-6 w-full" aria-hidden="true">
        <g stroke="rgb(167 139 250 / 0.7)" strokeWidth="1.5" fill="none">
          <path className={styles.mindLine} d="M110 55 C 80 55, 70 20, 40 20" />
          <path className={styles.mindLine} d="M110 55 C 80 55, 70 90, 40 90" />
          <path className={styles.mindLine} d="M110 55 C 140 55, 150 20, 180 20" />
          <path className={styles.mindLine} d="M110 55 C 140 55, 150 90, 180 90" />
        </g>
        <rect x="80" y="42" width="60" height="26" rx="13" fill="#7c3aed" />
        <text x="110" y="59" textAnchor="middle" fontSize="10" fill="white">Ideia</text>
        {[
          [40, 20],
          [40, 90],
          [180, 20],
          [180, 90],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x! - 22} y={y! - 9} width="44" height="18" rx="9" fill="rgb(255 255 255 / 0.1)" />
        ))}
      </svg>
    ),
  },
  {
    icon: NotebookPen,
    title: "Notas que acompanham você",
    body: "Listas de verificação, desenhos e cores. Salva sozinho enquanto você escreve.",
    span: "",
    art: (
      <div className="mt-6 space-y-2 rounded-2xl bg-amber-200/[0.06] p-4">
        <div className="h-2 w-2/3 rounded bg-white/25" />
        <div className="h-2 w-full rounded bg-white/10" />
        <div className="flex items-center gap-2 text-xs text-white/60">
          <CheckCircle2 className="size-3.5 text-emerald-400" /> Comprar café
        </div>
      </div>
    ),
  },
  {
    icon: Bell,
    title: "Lembretes no celular",
    body: "Notificações no horário certo, mesmo com o app fechado.",
    span: "",
    art: (
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <span className={cn(styles.ring, "grid size-9 place-items-center rounded-xl bg-violet-500/25 text-violet-200")}>
          <Bell className="size-4" />
        </span>
        <div className="text-xs">
          <p className="font-semibold">Revisar proposta</p>
          <p className="text-white/45">Agora · Flowy</p>
        </div>
      </div>
    ),
  },
  {
    icon: Tag,
    title: "Pastas e etiquetas inteligentes",
    body: "O Flowy sugere a pasta e as etiquetas certas enquanto você digita a tarefa.",
    span: "md:col-span-2",
    art: (
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["Trabalho", "#a78bfa"],
          ["Urgente", "#f87171"],
          ["Clientes", "#67e8f9"],
          ["Pessoal", "#4ade80"],
          ["Ideias", "#fbbf24"],
        ].map(([name, color]) => (
          <span
            key={name}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs"
          >
            <span className="size-2 rounded-full" style={{ background: color }} />
            {name}
          </span>
        ))}
        <span className="flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1.5 text-xs text-violet-100">
          <Sparkles className="size-3.5" /> Sugestão: Trabalho
        </span>
      </div>
    ),
  },
];

const extras = [
  { icon: Smartphone, label: "Instala como app no celular" },
  { icon: Lock, label: "Seus dados protegidos e privados" },
  { icon: LayoutList, label: "Funciona até offline" },
  { icon: Grid2x2, label: "Matriz de prioridades" },
  { icon: Moon, label: "Temas escuro, OLED e claro" },
  { icon: Sparkles, label: "Tour guiado no primeiro acesso" },
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
              <a href="#como-funciona" className="transition-colors hover:text-white">Como funciona</a>
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
          <section className="relative px-4 pb-10 pt-16 text-center sm:px-6 sm:pt-24">
            <div className={styles.gridFloor} aria-hidden="true" />
            <div className="relative mx-auto max-w-4xl">
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-[color:var(--muted)]">
                  <Sparkles className="size-3.5 text-[color:var(--violet-hot)]" />
                  Tarefas, notas, fluxogramas e mapas mentais em um só lugar
                </span>
              </Reveal>
              <Reveal wait={80}>
                <h1
                  className={cn(
                    styles.display,
                    "mt-6 font-[family-name:var(--font-display)] text-[2.9rem] font-extrabold sm:text-7xl md:text-[5.5rem]",
                  )}
                >
                  Sua mente,{" "}
                  <span className={cn(styles.serif, "font-[family-name:var(--font-serif)] font-normal")}>
                    em fluxo.
                  </span>
                </h1>
              </Reveal>
              <Reveal wait={160}>
                <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[color:var(--muted)] sm:text-lg">
                  O Flowy organiza o que você precisa fazer, pensar e lembrar. Escreva do seu
                  jeito, veja tudo com clareza e deixe o resto com a gente.
                </p>
              </Reveal>
              <Reveal wait={240} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

            <div className={cn(styles.stage, "relative mx-auto mt-16 max-w-5xl sm:mt-20")}>
              <div className={cn(styles.device, "relative h-[420px] sm:h-[520px]")}>
                <div className={cn(styles.deviceGlare, "pointer-events-none absolute inset-0 rounded-[1.5rem]")} />
                <AppMock />

                <div
                  className={cn(styles.float, "-left-2 top-16 hidden w-56 p-3 text-left md:block")}
                  style={depth(1.4)}
                >
                  <div className={styles.bob}>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Criada agora</p>
                    <p className="mt-1 text-sm font-semibold">Reunião com o time</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-violet-200">
                      <CalendarClock className="size-3.5" /> Amanhã às 15:00
                    </p>
                  </div>
                </div>

                <div
                  className={cn(styles.float, "-right-3 top-40 hidden w-52 p-3 text-left md:block")}
                  style={depth(2)}
                >
                  <div className={styles.bob} style={{ animationDelay: "-2s" }}>
                    <div className="flex items-center gap-2">
                      <span className={cn(styles.ring, "grid size-8 place-items-center rounded-lg bg-violet-500/25")}>
                        <Bell className="size-4 text-violet-200" />
                      </span>
                      <div>
                        <p className="text-xs font-semibold">Lembrete</p>
                        <p className="text-[11px] text-white/50">Academia em 10 min</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(styles.float, "bottom-10 left-1/3 hidden px-3 py-2 lg:block")}
                  style={depth(1)}
                >
                  <div className={cn(styles.bob, "flex items-center gap-2 text-xs")} style={{ animationDelay: "-4s" }}>
                    <Sparkles className="size-3.5 text-amber-300" /> Sugestão: pasta Trabalho
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden border-y border-white/5 py-5" aria-label="Destaques">
            <div className={cn(styles.marquee, "flex w-max gap-10")}>
              {[...extras, ...extras].map(({ icon: Icon, label }, index) => (
                <span key={`${label}-${index}`} className="flex items-center gap-2 whitespace-nowrap text-sm text-[color:var(--muted)]">
                  <Icon className="size-4 text-[color:var(--violet-hot)]" /> {label}
                </span>
              ))}
            </div>
          </section>

          <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32">
            <Reveal className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--violet-hot)]">Recursos</p>
              <DisplayHeading className="mt-4">
                Tudo o que você precisa.{" "}
                <span className="text-[color:var(--muted)]">Nada que atrapalhe.</span>
              </DisplayHeading>
            </Reveal>
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, title, body, span, art }, index) => (
                <Reveal key={title} wait={(index % 3) * 90} className={span}>
                  <article className={cn(styles.card, "h-full p-6 sm:p-7")}>
                    <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15 text-[color:var(--violet-hot)]">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-5 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{body}</p>
                    <div className={styles.cardArt}>{art}</div>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section id="como-funciona" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6 sm:pb-32">
            <Reveal className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--violet-hot)]">Como funciona</p>
              <DisplayHeading className="mt-4">Do caos à clareza em três passos.</DisplayHeading>
            </Reveal>
            <ol className="mt-14 grid gap-4 md:grid-cols-3">
              {[
                ["Crie sua conta", "Leva menos de um minuto. Só precisamos do seu nome, e-mail e uma senha."],
                ["Faça o tour", "No primeiro acesso, um tutorial rápido mostra o essencial e cria sua primeira tarefa."],
                ["Entre no fluxo", "Use no computador ou instale no celular. Tudo sincroniza em tempo real."],
              ].map(([title, body], index) => (
                <Reveal key={title} wait={index * 120}>
                  <li className={cn(styles.card, "h-full p-7")}>
                    <span className={cn(styles.stepNumber, "font-[family-name:var(--font-display)] text-6xl font-extrabold")}>
                      0{index + 1}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{body}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </section>

          <section className="px-4 pb-24 sm:px-6">
            <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-16 text-center sm:py-24">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_50%_0%,rgb(124_58_237/0.45),transparent_70%)]" />
              <div
                className={cn(styles.orbit, "pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10")}
                aria-hidden="true"
              />
              <DisplayHeading className="mx-auto max-w-2xl">
                Pronto para entrar no{" "}
                <span className={cn(styles.serif, "font-[family-name:var(--font-serif)] font-normal")}>fluxo</span>?
              </DisplayHeading>
              <p className="mx-auto mt-5 max-w-md text-[color:var(--muted)]">
                Crie sua conta grátis e organize seu dia ainda hoje.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
          © {new Date().getFullYear()} Flowy · Feito para mentes em movimento.
        </footer>
      </div>
    </LandingMotion>
  );
}
