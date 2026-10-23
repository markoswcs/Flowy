"use client";

import { ArrowLeft, ArrowRight, GraduationCap, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  TutorialScene,
  type SceneId,
} from "@/components/system/tutorial-scenes";
import type { NoteSection } from "@/features/notes/note-sections";
import { useIntroOffered } from "@/lib/intro-preferences";
import { holdOverlay } from "@/lib/overlay";
import { cn } from "@/lib/utils";

interface Step {
  scene: SceneId;
  title: string;
  text: string;
}

const LABEL: Record<NoteSection, string> = {
  nota: "Notas",
  mapa: "Mapas",
  desenho: "Desenhos",
};

const STEPS: Record<NoteSection, Step[]> = {
  nota: [
    {
      scene: "typing",
      title: "Escreva",
      text: "Salva sozinho, até sem internet.",
    },
    {
      scene: "toolbar",
      title: "Formate",
      text: "A barra fica acima do teclado.",
    },
    {
      scene: "checklist",
      title: "Checklists",
      text: "Marque cada item ao terminar.",
    },
    {
      scene: "image",
      title: "Imagens e desenho",
      text: "Fotos e rabiscos dentro da nota.",
    },
    {
      scene: "organize",
      title: "Organize",
      text: "Favoritos, pastas, etiquetas e cores.",
    },
  ],
  mapa: [
    {
      scene: "branches",
      title: "Crie ramos",
      text: "Toque num tópico e no botão +.",
    },
    {
      scene: "tap",
      title: "Edite",
      text: "Toque duas vezes ou comece a digitar.",
    },
    {
      scene: "drag",
      title: "Arraste",
      text: "Mude de ramo ou posicione onde quiser.",
    },
    {
      scene: "palette",
      title: "Estilo",
      text: "Cores, formas, ícones e prazos.",
    },
    {
      scene: "link",
      title: "Ligue ideias",
      text: "Setas entre ramos diferentes.",
    },
    {
      scene: "search",
      title: "Busque e apresente",
      text: "Ache qualquer tópico e apresente em tela cheia.",
    },
  ],
  desenho: [
    {
      scene: "shapes",
      title: "Formas e setas",
      text: "As setas grudam nas formas.",
    },
    { scene: "toolbar", title: "Ferramentas", text: "Tudo na barra do topo." },
    {
      scene: "organize",
      title: "Modelos prontos",
      text: "Menu ☰ › Modelos prontos.",
    },
    { scene: "pen", title: "Mão livre", text: "Lápis ou caneta stylus." },
  ],
};

// Where each section's "seen" flag lived before it moved to the account.
const LEGACY_PREFIX = "flowy:intro:";

function TutorialDialog({
  section,
  onClose,
}: {
  section: NoteSection;
  onClose: () => void;
}) {
  const steps = STEPS[section];
  const [index, setIndex] = useState(0);
  const step = steps[index] ?? steps[0];
  const last = index === steps.length - 1;

  useEffect(() => {
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight")
        setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (event.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, steps.length]);

  if (!step) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="flowy-glass-scrim absolute inset-0 animate-fade-in"
        aria-label="Fechar tutorial"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="flowy-glass flowy-glass-strong relative w-full max-w-md animate-in rounded-t-[1.75rem] border p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] fade-in slide-in-from-bottom-6 sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar tutorial"
          className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <X className="size-4" />
        </button>
        <p className="text-xs font-semibold uppercase tracking-widest flowy-ink">
          Como usar {LABEL[section]} · {index + 1} de {steps.length}
        </p>
        <div
          key={index}
          className="mt-5 flex animate-in flex-col items-center text-center fade-in slide-in-from-right-4"
        >
          <div className="grid w-full place-items-center rounded-3xl bg-gradient-to-br from-primary/15 to-fuchsia-500/10 py-3 ring-1 ring-primary/20">
            <TutorialScene id={step.scene} />
          </div>
          <h2 id="tutorial-title" className="mt-5 text-xl font-semibold">
            {step.title}
          </h2>
          <p className="mt-1.5 min-h-[3rem] text-sm leading-6 text-muted-foreground">
            {step.text}
          </p>
        </div>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full bg-muted-foreground/30 transition-all",
                i === index ? "w-6 bg-primary" : "w-1.5",
              )}
            />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => (index === 0 ? onClose() : setIndex(index - 1))}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium hover:bg-accent"
          >
            {index === 0 ? (
              "Pular"
            ) : (
              <>
                <ArrowLeft className="size-4" /> Voltar
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {last ? (
              "Começar"
            ) : (
              <>
                Próximo <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

/**
 * First visit to a section offers an optional tour, once per account: "Ver
 * tutorial" and "Agora não" both retire the offer on every device. The tour
 * can always be opened again from the "Como funciona" button.
 */
export function SectionTutorial({ section }: { section: NoteSection }) {
  const [open, setOpen] = useState(false);
  const [offered, dismiss] = useIntroOffered(`section:${section}`, [LEGACY_PREFIX + section]);

  return (
    <>
      {offered ? (
        <div className="flex animate-in items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] p-3 pl-4 fade-in slide-in-from-top-2 sm:p-4">
          <GraduationCap
            className="size-6 shrink-0 flowy-ink"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 text-sm leading-5">
            <strong className="font-semibold">
              Primeira vez em {LABEL[section]}?
            </strong>{" "}
            <span className="text-muted-foreground">
              Veja em 1 minuto como funciona.
            </span>
          </p>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                dismiss();
                setOpen(true);
              }}
              className="min-h-10 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Ver tutorial
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="min-h-10 rounded-xl px-3.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Agora não
            </button>
          </div>
        </div>
      ) : null}
      {open ? (
        <TutorialDialog section={section} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

/** Small "Como funciona" button that reopens the tour at any time. */
export function TutorialButton({ section }: { section: NoteSection }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <GraduationCap className="size-4" aria-hidden="true" />
        Como funciona
      </button>
      {open ? (
        <TutorialDialog section={section} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
