"use client";

import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Folder,
  Mic,
  Repeat2,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import styles from "./landing.module.css";

const WORDS = ["tarefas", "treinos", "reuniões", "ideias", "aulas"];

/** The hero's changing word: each one slides up and out as the next arrives. */
export function RotatingWord() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % WORDS.length),
      2200,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className={styles.rotator} aria-live="off">
      {/* The longest word keeps the width steady. */}
      <span className="invisible">reuniões</span>
      {WORDS.map((word, position) => (
        <span
          key={word}
          aria-hidden={position !== index}
          className={cn(
            styles.rotatorWord,
            position === index && styles.rotatorOn,
            position === (index + WORDS.length - 1) % WORDS.length &&
              styles.rotatorOff,
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

const STEPS = [
  {
    title: "Escreva ou fale",
    body: "Do jeito que sai da cabeça, digitando ou pelo microfone.",
  },
  {
    title: "O Flowy organiza",
    body: "Entende data, hora, repetição e pasta sozinho.",
  },
  {
    title: "E te lembra na hora",
    body: "Notificação no celular e no PC, mesmo com o app fechado.",
  },
];

/** Three steps that play on their own (and on a tap), each with its own little screen. */
export function HowItWorks() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(
      () => setStep((value) => (value + 1) % STEPS.length),
      3800,
    );
    return () => window.clearTimeout(timer);
  }, [step, paused]);

  return (
    <div
      className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <ol className="space-y-3">
        {STEPS.map(({ title, body }, index) => (
          <li key={title}>
            <button
              type="button"
              onClick={() => setStep(index)}
              aria-current={step === index}
              className={cn(
                "relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300",
                step === index
                  ? "border-violet-400/40 bg-violet-500/[0.08]"
                  : "border-white/[0.07] bg-white/[0.02] opacity-60 hover:opacity-90",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors",
                    step === index
                      ? "bg-violet-500 text-white"
                      : "bg-white/[0.06] text-white/60",
                  )}
                >
                  {index + 1}
                </span>
                <span>
                  <span className="block font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                    {title}
                  </span>
                  <span className="block text-sm text-[color:var(--muted)]">
                    {body}
                  </span>
                </span>
              </span>
              {step === index ? (
                <span
                  key={`${step}-${paused}`}
                  className={cn(styles.stepBar, paused && styles.stepBarPaused)}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          </li>
        ))}
      </ol>

      <div
        className={cn(
          styles.stepStage,
          "relative h-[300px] rounded-[1.75rem] border border-white/10 p-6",
        )}
      >
        <div key={step} className={styles.stepScene}>
          {step === 0 ? (
            <div className="flex h-full flex-col justify-center gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5">
                <span
                  className={cn(styles.typing, "min-w-0 flex-1 text-[15px]")}
                >
                  Academia amanhã às 7h toda semana
                </span>
                <span
                  className={cn(
                    styles.ring,
                    "grid size-9 shrink-0 place-items-center rounded-full bg-violet-500 text-white",
                  )}
                >
                  <Mic className="size-4" />
                </span>
              </div>
              <p className="text-center text-xs text-white/40">
                Fale naturalmente. Nada de formulários.
              </p>
            </div>
          ) : step === 1 ? (
            <div className="flex h-full flex-col justify-center">
              <div className="rounded-2xl border border-white/10 bg-[#161616] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-violet-400/60 bg-violet-500/10" />
                  <div className="min-w-0">
                    <p className="font-semibold">Academia</p>
                    <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {[
                        {
                          icon: CalendarDays,
                          text: "Amanhã · 07:00",
                          tone: "bg-violet-500/20 text-violet-200",
                        },
                        {
                          icon: Repeat2,
                          text: "Toda semana",
                          tone: "bg-sky-500/15 text-sky-300",
                        },
                        {
                          icon: Folder,
                          text: "Pessoal",
                          tone: "bg-emerald-500/15 text-emerald-300",
                        },
                      ].map(({ icon: Icon, text, tone }, position) => (
                        <span
                          key={text}
                          className={cn(
                            styles.popIn,
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                            tone,
                          )}
                          style={{
                            animationDelay: `${200 + position * 180}ms`,
                          }}
                        >
                          <Icon className="size-3.5" /> {text}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-violet-200/80">
                <Sparkles className="size-3.5" /> Data, hora, repetição e pasta
                preenchidas sozinhas
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div
                className={cn(
                  styles.dropIn,
                  "w-full max-w-sm rounded-2xl border border-white/15 bg-white/[0.07] p-3.5 shadow-2xl backdrop-blur",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      styles.ring,
                      "grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500 text-white",
                    )}
                  >
                    <Bell className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center justify-between text-[11px] text-white/50">
                      Flowy <span>agora</span>
                    </p>
                    <p className="text-sm font-semibold">Academia</p>
                    <p className="text-xs text-white/60">
                      Hoje às 07:00 · Pessoal
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <span className="inline-flex items-center justify-center gap-1 rounded-lg bg-violet-500/25 py-1.5 font-medium">
                    <Check className="size-3.5" /> Concluir
                  </span>
                  <span className="rounded-lg bg-white/[0.06] py-1.5 text-center text-white/70">
                    Daqui 10 min
                  </span>
                </div>
              </div>
              <p className="text-xs text-white/40">
                Conclua direto da notificação.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A number that counts up the first time it comes into view. */
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      if (reduce) {
        setValue(to);
        return;
      }
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 1400);
        setValue(Math.round(to * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [to]);
  return (
    <span ref={ref} className="tabular-nums">
      {value}
      {suffix}
    </span>
  );
}

const QUESTIONS = [
  {
    q: "O Flowy é grátis?",
    a: "Sim. Crie a conta e use tudo: tarefas, agenda, treinos, notas, mapas e desenhos.",
  },
  {
    q: "Funciona no iPhone e no Android?",
    a: "Funciona nos dois e no computador. Você instala direto do navegador e ele vira um app na tela inicial.",
  },
  {
    q: "Os lembretes chegam com o app fechado?",
    a: "Chegam. Depois de permitir as notificações, o Flowy avisa no horário da tarefa, no celular e no PC.",
  },
  {
    q: "Conecta com o Google Agenda?",
    a: "Com um toque, sem copiar links. Dá para juntar até 3 contas Google e escolher quais agendas aparecem.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Cada conta vê só o próprio conteúdo, e você pode exportar seus treinos quando quiser.",
  },
];

/** Frequently asked questions, opening one at a time. */
export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-white/[0.07] rounded-[1.75rem] border border-white/[0.08] bg-white/[0.02]">
      {QUESTIONS.map(({ q, a }, index) => (
        <div key={q}>
          <button
            type="button"
            onClick={() => setOpen(open === index ? -1 : index)}
            aria-expanded={open === index}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium transition-colors hover:text-white sm:px-6"
          >
            {q}
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-white/50 transition-transform duration-300",
                open === index && "rotate-180",
              )}
            />
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-out",
              open === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <p className="overflow-hidden px-5 text-sm leading-6 text-[color:var(--muted)] sm:px-6">
              <span className="block pb-4">{a}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
