"use client";

import { Disc3, Dumbbell, Hand, Repeat, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";

import { useIntroOffered } from "@/lib/intro-preferences";

/** Bump the key with each new batch of news: everyone sees the card again once. */
const NEWS_KEY = "whats-new:0.25";
const SNOOZE_KEY = `flowy:${NEWS_KEY}:snoozed`;
const snoozeListeners = new Set<() => void>();

const NEWS = [
  { icon: Hand, title: "Segure um botão da barra de baixo", text: "e troque o atalho por outro, no celular." },
  { icon: Repeat, title: "Planos prontos e rodízio", text: "Push/Pull/Legs, Superior/Inferior, Corpo todo ou 5×5, na ordem que você treinar." },
  { icon: Dumbbell, title: "Séries mais completas", text: "aquecimento, drop set, até a falha, quanto ainda daria (RIR) e bi-set." },
  { icon: Disc3, title: "Calculadora de anilhas", text: "mostra o que colocar de cada lado da barra." },
  { icon: Trophy, title: "Seu progresso", text: "o ano em quadradinhos, tudo o que já levantou e importar do Strong ou Hevy." },
];

/** "Agora não" hides it until the app is opened again; "Não lembrar mais" is for good. */
function readSnoozed() {
  try {
    return window.sessionStorage.getItem(SNOOZE_KEY) === "1";
  } catch {
    return false;
  }
}

function snooze() {
  try {
    window.sessionStorage.setItem(SNOOZE_KEY, "1");
  } catch {
    // Private mode: the card simply stays until "Não lembrar mais".
  }
  snoozeListeners.forEach((listener) => listener());
}

/** What's new in the Flowy, on the home screen until the person says not to remind again. */
export function WhatsNewCard() {
  const [offered, dismiss] = useIntroOffered(NEWS_KEY);
  const snoozed = useSyncExternalStore(
    (listener) => {
      snoozeListeners.add(listener);
      return () => snoozeListeners.delete(listener);
    },
    readSnoozed,
    () => true,
  );
  if (!offered || snoozed) return null;

  return (
    <section
      className="rounded-3xl border border-primary/30 bg-primary/[0.06] p-4 animate-in fade-in slide-in-from-top-2 sm:p-5"
      aria-labelledby="whats-new-title"
    >
      <h2 id="whats-new-title" className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-5 flowy-ink" aria-hidden="true" />
        Novidades no Flowy
      </h2>
      <ul className="mt-3 space-y-2.5">
        {NEWS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3 text-sm">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/15 flowy-ink">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 pt-1">
              <span className="font-medium">{title}</span> <span className="text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href="/app/workouts"
          onClick={snooze}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Dumbbell className="size-4" aria-hidden="true" />
          Ver em Treinos
        </Link>
        <button
          type="button"
          onClick={snooze}
          className="h-9 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          Agora não
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="h-9 rounded-full px-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Não lembrar mais
        </button>
      </div>
    </section>
  );
}
