"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Focus,
  FolderOpen,
  GraduationCap,
  Hand,
  ImagePlus,
  LayoutTemplate,
  MousePointer2,
  Network,
  Palette,
  PenLine,
  PenTool,
  Pencil,
  Plus,
  Search,
  Shapes,
  Spline,
  Type,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { NoteSection } from "@/features/notes/note-sections";
import { holdOverlay } from "@/lib/overlay";
import { cn } from "@/lib/utils";

interface Step {
  icon: LucideIcon;
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
      icon: Type,
      title: "Escreva à vontade",
      text: "Toque em Nova nota e comece pelo título. O texto salva sozinho enquanto você escreve, até sem internet.",
    },
    {
      icon: PenLine,
      title: "Formate pela barra",
      text: "Negrito, títulos, listas e citações ficam na barra do editor. No celular ela aparece logo acima do teclado.",
    },
    {
      icon: CheckSquare,
      title: "Listas de tarefas",
      text: "Use a caixa de seleção para criar uma checklist e marque cada item ao terminar.",
    },
    {
      icon: ImagePlus,
      title: "Imagens e desenho",
      text: "Adicione fotos, links e um desenho à mão dentro da própria nota.",
    },
    {
      icon: FolderOpen,
      title: "Organize do seu jeito",
      text: "Favorite com a estrela e use pastas, etiquetas e cores para achar tudo depois. A busca procura no título e no texto.",
    },
  ],
  mapa: [
    {
      icon: Network,
      title: "Tudo parte de uma ideia",
      text: "O mapa começa com a ideia central. Escolha um modelo pronto ou comece do zero.",
    },
    {
      icon: Plus,
      title: "Crie ramos",
      text: "Toque num tópico e use o botão + para criar um subtópico. No teclado: Tab cria um subtópico e Enter cria um tópico irmão.",
    },
    {
      icon: Pencil,
      title: "Edite o texto",
      text: "Toque duas vezes no tópico, ou selecione e comece a digitar. F2 também abre a edição.",
    },
    {
      icon: Hand,
      title: "Arraste para organizar",
      text: "Arraste um tópico para outro para mudar de ramo, ou solte no espaço vazio para posicionar à mão. Pince ou use Ctrl+roda para dar zoom.",
    },
    {
      icon: Palette,
      title: "Deixe com a sua cara",
      text: "Em Formatar você muda forma, cores, ícones, prioridade, prazo e etiquetas do tópico, e também o layout e o tema do mapa.",
    },
    {
      icon: Spline,
      title: "Ligue ideias",
      text: "Use Ligar para criar uma seta entre dois tópicos de ramos diferentes, e Limite para emoldurar um grupo.",
    },
    {
      icon: Search,
      title: "Encontre e apresente",
      text: "Buscar acha qualquer tópico, Estrutura mostra o mapa como lista e Apresentar passa tópico por tópico em tela cheia.",
    },
    {
      icon: Focus,
      title: "Foque e compartilhe",
      text: "Focar mostra só um ramo. Em Arquivo você importa e exporta XMind, MindMeister (FreeMind), OPML, imagem e texto.",
    },
  ],
  desenho: [
    {
      icon: MousePointer2,
      title: "Ferramentas no topo",
      text: "Escolha seleção, retângulo, losango, elipse, seta, linha, lápis e texto na barra de ferramentas.",
    },
    {
      icon: Shapes,
      title: "Monte fluxogramas",
      text: "Desenhe as caixas e ligue com setas: a seta gruda na forma e acompanha quando você a move. Toque duas vezes numa forma para escrever dentro.",
    },
    {
      icon: LayoutTemplate,
      title: "Comece por um modelo",
      text: "No menu (☰), em Modelos prontos, há fluxo de processo, decisão sim/não, organograma e linha do tempo.",
    },
    {
      icon: PenTool,
      title: "Desenho livre",
      text: "Use o lápis para escrever ou rabiscar à mão. Com caneta stylus, ative o modo caneta para desenhar sem mover a tela.",
    },
    {
      icon: Palette,
      title: "Estilo e exportação",
      text: "Mude cor, traço e preenchimento no painel da forma. Pelo menu você exporta imagem e salva no Flowy.",
    },
  ],
};

const SEEN_PREFIX = "flowy:intro:";

function readSeen(section: NoteSection): boolean {
  try {
    return window.localStorage.getItem(SEEN_PREFIX + section) === "1";
  } catch {
    return true;
  }
}

function markSeen(section: NoteSection) {
  try {
    window.localStorage.setItem(SEEN_PREFIX + section, "1");
  } catch {
    // Private mode: the offer simply shows again next time.
  }
}

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
  const Icon = step.icon;

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
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Como usar {LABEL[section]} · {index + 1} de {steps.length}
        </p>
        <div
          key={index}
          className="mt-5 flex animate-in flex-col items-center text-center fade-in slide-in-from-right-4"
        >
          <span className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-primary/25 to-fuchsia-500/20 text-primary ring-1 ring-primary/30">
            <Icon className="size-9" aria-hidden="true" />
          </span>
          <h2 id="tutorial-title" className="mt-5 text-xl font-semibold">
            {step.title}
          </h2>
          <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">
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
 * First visit to a section offers an optional tour; it can always be opened
 * again from the "Como funciona" button.
 */
export function SectionTutorial({ section }: { section: NoteSection }) {
  const [seen, setSeen] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reading storage only after mount keeps server and client markup equal.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const offered = mounted && !seen[section] && !readSeen(section);

  function dismiss() {
    markSeen(section);
    setSeen((current) => ({ ...current, [section]: true }));
  }

  return (
    <>
      {offered ? (
        <div className="flex animate-in items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] p-3 pl-4 fade-in slide-in-from-top-2 sm:p-4">
          <GraduationCap
            className="size-6 shrink-0 text-primary"
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
