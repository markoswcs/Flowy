"use client";

import {
  Download,
  FileText,
  Folder,
  LayoutGrid,
  List,
  Network,
  PenTool,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";
import { notify } from "@/providers/notification-provider";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateNote,
  useNotes,
  useRestoreNote,
  useToggleNoteFavorite,
  useTrashNote,
} from "@/features/notes/use-notes";
import { TEMPLATE_PARAM } from "@/features/mindmap/components/constants";
import {
  NEW_PARAM,
  parseSection,
  SECTION_HREF,
  SECTION_KIND,
  type NoteSection,
} from "@/features/notes/note-sections";
import {
  SectionTutorial,
  TutorialButton,
} from "@/features/notes/section-tutorial";
import { TemplatePicker } from "@/features/mindmap/components/template-picker";
import type { TemplateId } from "@/features/mindmap/types";
import type { Note, NoteKind } from "@/types/content";
import {
  NOTE_TEMPLATES,
  type NoteTemplate,
} from "@/features/notes/note-templates";
import { cn } from "@/lib/utils";
import { holdOverlay } from "@/lib/overlay";

const MAP_TITLES: Partial<Record<TemplateId, string>> = {
  org: "Organograma sem título",
};

const SECTION_COPY: Record<
  NoteSection,
  {
    eyebrow: string;
    title: string;
    description: string;
    create: string;
    empty: string;
    emptyHint: string;
    search: string;
    notFound: string;
  }
> = {
  nota: {
    eyebrow: "Espaço de escrita",
    title: "Notas",
    description:
      "Capture ideias, referências e planos em um lugar simples de consultar.",
    create: "Nova nota",
    empty: "Sua primeira nota começa aqui",
    emptyHint:
      "Crie uma nota para guardar o que importa e retome quando quiser.",
    search: "Pesquisar notas",
    notFound: "Nenhuma nota encontrada",
  },
  mapa: {
    eyebrow: "Mapas mentais",
    title: "Mapas",
    description:
      "Organize ideias em ramos, organogramas e linhas do tempo, no estilo XMind.",
    create: "Novo mapa",
    empty: "Seu primeiro mapa mental começa aqui",
    emptyHint: "Comece com um modelo pronto ou do zero.",
    search: "Pesquisar mapas",
    notFound: "Nenhum mapa encontrado",
  },
  desenho: {
    eyebrow: "Quadro livre",
    title: "Desenhos",
    description:
      "Fluxogramas, esboços e diagramas desenhados à mão, com o Excalidraw.",
    create: "Novo desenho",
    empty: "Seu primeiro desenho começa aqui",
    emptyHint: "Desenhe um fluxograma, um esboço ou o que vier à cabeça.",
    search: "Pesquisar desenhos",
    notFound: "Nenhum desenho encontrado",
  },
};

const SECTION_ICON: Record<NoteSection, typeof FileText> = {
  nota: FileText,
  mapa: Network,
  desenho: PenTool,
};

const SECTION_TONE: Record<
  NoteSection,
  { solid: string; soft: string; ink: string }
> = {
  nota: {
    solid: "bg-gradient-to-br from-amber-400 to-orange-500",
    soft: "from-amber-500/15",
    ink: "text-amber-300",
  },
  mapa: {
    solid: "bg-gradient-to-br from-violet-500 to-indigo-600",
    soft: "from-violet-500/15",
    ink: "text-violet-300",
  },
  desenho: {
    solid: "bg-gradient-to-br from-sky-400 to-cyan-600",
    soft: "from-sky-500/15",
    ink: "text-sky-300",
  },
};

/** What each space can do, shown where people start (so they see it exists). */
const SECTION_TIPS: Record<
  NoteSection,
  { icon: typeof FileText; title: string; text: string }[]
> = {
  nota: [],
  mapa: [
    {
      icon: Network,
      title: "Ramos com Tab e Enter",
      text: "Tab cria um filho, Enter cria um irmão.",
    },
    {
      icon: Sparkles,
      title: "Cores e ícones",
      text: "Toque num tópico para mudar cor, forma e ícone.",
    },
    {
      icon: Download,
      title: "Exporte em imagem",
      text: "Salve o mapa em PNG para compartilhar.",
    },
  ],
  desenho: [
    {
      icon: PenTool,
      title: "Formas e setas",
      text: "Retângulos, losangos e setas que se ligam.",
    },
    {
      icon: Sparkles,
      title: "Traço à mão",
      text: "Rabisque livre com o dedo ou a caneta.",
    },
    {
      icon: Download,
      title: "Exporte em imagem",
      text: "Salve o desenho em PNG ou SVG.",
    },
  ],
};

type Sort = "recent" | "az";
const SORTS: { value: Sort; label: string }[] = [
  { value: "recent", label: "Recentes" },
  { value: "az", label: "A–Z" },
];
const LAYOUT_KEY = "flowy:notes-layout";

const layoutListeners = new Set<() => void>();
function readLayout(): "grid" | "list" {
  try {
    return window.localStorage.getItem(LAYOUT_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}
function subscribeLayout(listener: () => void) {
  layoutListeners.add(listener);
  return () => layoutListeners.delete(listener);
}

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
/** "há 5 minutos", "ontem", "há 3 semanas". */
function edited(iso: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size)
      return relative.format(Math.round(seconds / size), unit);
  }
  return "agora";
}

/** A small picture of what is inside: lines of text, branches or a sketch. */
function Preview({ note }: { note: Note }) {
  if (note.kind === "mindmap") {
    return (
      <svg viewBox="0 0 120 56" className="h-14 w-full" aria-hidden="true">
        <g
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.4"
          fill="none"
        >
          <path d="M60 28 C 44 28, 40 10, 22 10" />
          <path d="M60 28 C 44 28, 40 46, 22 46" />
          <path d="M60 28 C 76 28, 80 10, 98 10" />
          <path d="M60 28 C 76 28, 80 46, 98 46" />
        </g>
        <rect
          x="44"
          y="20"
          width="32"
          height="16"
          rx="8"
          className="fill-violet-500"
        />
        {[
          [22, 10],
          [22, 46],
          [98, 10],
          [98, 46],
        ].map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x! - 13}
            y={y! - 6}
            width="26"
            height="12"
            rx="6"
            fill="currentColor"
            fillOpacity="0.14"
          />
        ))}
      </svg>
    );
  }
  if (note.kind === "excalidraw") {
    return (
      <svg viewBox="0 0 120 56" className="h-14 w-full" aria-hidden="true">
        <g
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect
            x="8"
            y="14"
            width="34"
            height="24"
            rx="4"
            className="stroke-sky-400"
            strokeOpacity="0.9"
          />
          <path d="M42 26 L 62 26" />
          <path d="M58 22 L 62 26 L 58 30" />
          <path d="M80 10 L 98 28 L 80 46 L 62 28 Z" />
          <path
            d="M98 28 C 106 20, 112 34, 116 26"
            className="stroke-sky-400"
            strokeOpacity="0.9"
          />
        </g>
      </svg>
    );
  }
  return null;
}

export function NoteList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notes = useNotes();
  const create = useCreateNote();
  const trash = useTrashNote();
  const restore = useRestoreNote();
  const toggleFavorite = useToggleNoteFavorite();
  const [search, setSearch] = useState("");
  const [notePendingDeletion, setNotePendingDeletion] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const section = parseSection(searchParams.get("tipo"));
  const pageCopy = SECTION_COPY[section];
  const EmptyIcon = SECTION_ICON[section];
  // "+ Mapa mental" from anywhere lands here with ?novo=1.
  const templatePickerOpen =
    pickerOpen || (section === "mapa" && searchParams.has(NEW_PARAM));

  const filteredNotes = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    // Favourites stay on top, like pinned notes on Samsung and Apple Notes.
    const notesByType = (notes.data ?? [])
      .filter((note) => note.kind === SECTION_KIND[section])
      .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
    if (!term) return notesByType;

    return notesByType.filter((note) =>
      `${note.title} ${note.plain_text}`
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [deferredSearch, notes.data, section]);

  const [sort, setSort] = useState<Sort>("recent");
  const layout = useSyncExternalStore(subscribeLayout, readLayout, () => "grid" as const);
  const [filter, setFilter] = useState("all");

  function chooseLayout(value: "grid" | "list") {
    try {
      window.localStorage.setItem(LAYOUT_KEY, value);
    } catch {
      // Private mode: the grid stays.
    }
    layoutListeners.forEach((listener) => listener());
  }

  const ofSection = (notes.data ?? []).filter(
    (note) => note.kind === SECTION_KIND[section],
  );
  const favoritesCount = ofSection.filter((note) => note.is_favorite).length;
  const folderChips = [
    ...new Map(
      ofSection
        .filter((note) => note.folder)
        .map((note) => [
          note.folder!.id,
          { id: note.folder!.id, name: note.folder!.name },
        ]),
    ).values(),
  ];
  const visibleNotes = filteredNotes
    .filter((note) =>
      filter === "all"
        ? true
        : filter === "fav"
          ? note.is_favorite
          : note.folder?.id === filter,
    )
    .sort((a, b) =>
      sort === "az"
        ? (a.title || "").localeCompare(b.title || "", "pt-BR")
        : b.updated_at.localeCompare(a.updated_at),
    );
  const groups =
    filter === "all" && favoritesCount
      ? [
          {
            title: "Favoritas",
            items: visibleNotes.filter((note) => note.is_favorite),
          },
          {
            title: "Todas",
            items: visibleNotes.filter((note) => !note.is_favorite),
          },
        ]
      : [{ title: "Todas", items: visibleNotes }];

  function actions(note: Note, compact = false) {
    return (
      <div
        className={cn(
          "z-10 flex items-center gap-0.5",
          compact ? "" : "absolute right-2 top-2",
        )}
      >
        <button
          type="button"
          onClick={() => handleFavorite(note.id, !note.is_favorite)}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-all hover:scale-110 hover:bg-amber-500/15 hover:text-amber-400 active:scale-95"
          aria-label={`${note.is_favorite ? "Remover" : "Adicionar"} ${note.title || "nota"} dos favoritos`}
        >
          <Star
            className={cn(
              "size-4",
              note.is_favorite && "fill-amber-400 text-amber-400",
            )}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={() =>
            setNotePendingDeletion({
              id: note.id,
              title: note.title || "Sem título",
            })
          }
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-all hover:scale-110 hover:bg-destructive/10 hover:text-destructive active:scale-95"
          aria-label={`Mover ${note.title || "nota"} para a lixeira`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  function renderCard(note: Note) {
    const tone = SECTION_TONE[section];
    return (
      <article
        className={cn(
          "group relative flex h-full min-h-48 flex-col overflow-hidden rounded-[1.4rem] border border-border/70 bg-gradient-to-b to-card/60 p-4 pt-11 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl sm:p-5 sm:pt-12",
          tone.soft,
        )}
        style={note.color ? { backgroundColor: note.color } : undefined}
      >
        <Link
          href={`/app/notes/${note.id}`}
          className="absolute inset-0 rounded-[1.4rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-label={`Abrir ${note.title || "sem título"}`}
        />
        <span
          className={cn(
            "pointer-events-none absolute left-4 top-3.5 text-[10px] font-bold uppercase tracking-widest sm:left-5",
            tone.ink,
          )}
        >
          {section === "nota"
            ? "Nota"
            : section === "mapa"
              ? "Mapa"
              : "Desenho"}
        </span>
        {actions(note)}
        <div className={cn("pointer-events-none relative", tone.ink)}>
          <Preview note={note} />
        </div>
        <div className="pointer-events-none relative min-w-0">
          <h3 className="line-clamp-2 text-base font-bold leading-5 sm:text-lg sm:leading-6">
            {note.title || "Sem título"}
          </h3>
          {note.kind === "text" ? (
            <p className="mt-2 line-clamp-4 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              {note.plain_text || "Nota vazia"}
            </p>
          ) : note.kind === "mindmap" && note.plain_text ? (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {note.plain_text}
            </p>
          ) : null}
        </div>
        <footer className="pointer-events-none relative mt-auto flex flex-wrap items-center gap-1.5 pt-4 text-[11px] text-muted-foreground">
          {note.folder ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5">
              <Folder className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{note.folder.name}</span>
            </span>
          ) : null}
          <time dateTime={note.updated_at}>{edited(note.updated_at)}</time>
        </footer>
      </article>
    );
  }

  function renderRow(note: Note) {
    const Icon = SECTION_ICON[section];
    return (
      <article className="group relative flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-3 transition-colors hover:border-primary/40 hover:bg-card">
        <Link
          href={`/app/notes/${note.id}`}
          className="absolute inset-0 rounded-2xl"
          aria-label={`Abrir ${note.title || "sem título"}`}
        />
        <span
          className={cn(
            "pointer-events-none grid size-10 shrink-0 place-items-center rounded-xl text-white",
            SECTION_TONE[section].solid,
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span className="pointer-events-none min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {note.title || "Sem título"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {edited(note.updated_at)}
            {note.folder ? ` · ${note.folder.name}` : ""}
            {note.kind === "text" && note.plain_text
              ? ` · ${note.plain_text}`
              : ""}
          </span>
        </span>
        <div className="relative">{actions(note, true)}</div>
      </article>
    );
  }

  const overlayOpen = Boolean(notePendingDeletion);
  useEffect(() => {
    if (!overlayOpen) return;
    const release = holdOverlay();
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNotePendingDeletion(null);
    };
    window.addEventListener("keydown", close);
    return () => {
      release();
      window.removeEventListener("keydown", close);
    };
  }, [overlayOpen]);

  function startCreate() {
    if (section === "mapa") return setPickerOpen(true);
    void handleCreate(SECTION_KIND[section]);
  }

  function closePicker() {
    setPickerOpen(false);
    if (searchParams.has(NEW_PARAM)) router.replace(SECTION_HREF.mapa);
  }

  async function handleCreate(
    kind: NoteKind,
    template?: TemplateId,
    noteTemplate?: NoteTemplate,
  ) {
    try {
      const note = await create.mutateAsync({
        kind,
        title:
          kind === "mindmap"
            ? ((template && MAP_TITLES[template]) ?? "Mapa mental sem título")
            : kind === "excalidraw"
              ? "Desenho sem título"
              : noteTemplate?.title || undefined,
        ...(noteTemplate?.content ? { content: noteTemplate.content } : {}),
      });
      setPickerOpen(false);
      const query = template ? `?${TEMPLATE_PARAM}=${template}` : "";
      router.push(`/app/notes/${note.id}${query}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (kind !== "text" && /kind|excalidraw|mindmap/i.test(message)) {
        toast.error(
          "O banco ainda precisa receber a atualização dos diagramas.",
        );
        return;
      }
      toast.error("Não foi possível criar a nota.");
    }
  }

  async function handleTrash(noteId: string) {
    try {
      await trash.mutateAsync(noteId);
      notify("Movida para a lixeira", {
        action: {
          label: "Desfazer",
          onClick: () => {
            restore.mutate(noteId, {
              onSuccess: () => notify("Nota restaurada"),
              onError: () => toast.error("Não foi possível restaurar a nota."),
            });
          },
        },
      });
    } catch {
      toast.error("Não foi possível excluir a nota.");
    }
  }

  async function handleFavorite(noteId: string, isFavorite: boolean) {
    try {
      await toggleFavorite.mutateAsync({ noteId, isFavorite });
    } catch {
      toast.error("Não foi possível atualizar o favorito.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* The three spaces side by side, one tap apart. */}
      <nav
        aria-label="Espaços"
        className="flex gap-1 rounded-2xl border border-border/60 bg-card/40 p-1"
      >
        {(Object.keys(SECTION_COPY) as NoteSection[]).map((value) => {
          const Icon = SECTION_ICON[value];
          const active = value === section;
          const total = (notes.data ?? []).filter(
            (note) => note.kind === SECTION_KIND[value],
          ).length;
          return (
            <Link
              key={value}
              href={SECTION_HREF[value]}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                active
                  ? cn("text-white shadow-lg", SECTION_TONE[value].solid)
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {SECTION_COPY[value].title}
              {notes.data ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    active ? "bg-white/20" : "bg-muted/60",
                  )}
                >
                  {total}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-2xl text-white shadow-xl",
              SECTION_TONE[section].solid,
            )}
          >
            <EmptyIcon className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {pageCopy.title}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              {pageCopy.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TutorialButton key={section} section={section} />
          <Button
            type="button"
            onClick={startCreate}
            loading={create.isPending}
          >
            <Plus className="size-4" aria-hidden="true" />
            {pageCopy.create}
          </Button>
        </div>
      </header>

      <SectionTutorial key={section} section={section} />

      {/* Ways to start, always in sight. */}
      <section aria-label="Começar com">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Começar com
        </p>
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {section === "nota" ? (
            NOTE_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  type="button"
                  disabled={create.isPending}
                  onClick={() => void handleCreate("text", undefined, template)}
                  className="group flex w-36 shrink-0 flex-col gap-2 rounded-2xl border border-border/60 bg-card/50 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card disabled:opacity-60"
                >
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-xl transition-transform group-hover:scale-110",
                      template.tone,
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">
                      {template.label}
                    </span>
                    <span className="block text-[11px] leading-4 text-muted-foreground">
                      {template.hint}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <>
              <button
                type="button"
                onClick={startCreate}
                disabled={create.isPending}
                className="group flex w-44 shrink-0 flex-col gap-2 rounded-2xl border border-border/60 bg-card/50 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl text-white",
                    SECTION_TONE[section].solid,
                  )}
                >
                  <Plus className="size-[18px]" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {section === "mapa"
                      ? "Escolher um modelo"
                      : "Quadro em branco"}
                  </span>
                  <span className="block text-[11px] leading-4 text-muted-foreground">
                    {section === "mapa"
                      ? "Mapa, organograma ou linha do tempo"
                      : "Desenhe livre, com formas e setas"}
                  </span>
                </span>
              </button>
              {SECTION_TIPS[section].map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex w-52 shrink-0 gap-2.5 rounded-2xl border border-dashed border-border/60 p-3"
                >
                  <Icon
                    className="mt-0.5 size-4 shrink-0 flowy-ink"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-xs font-semibold">{title}</span>
                    <span className="block text-[11px] leading-4 text-muted-foreground">
                      {text}
                    </span>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* Search, order and how to see them. */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">{pageCopy.search}</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={pageCopy.search}
            className="h-11 w-full rounded-xl border border-border/70 bg-card/40 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <div
          className="flex rounded-xl border border-border/70 bg-card/40 p-0.5"
          role="group"
          aria-label="Ordenar"
        >
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={sort === option.value}
              onClick={() => setSort(option.value)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                sort === option.value
                  ? "bg-primary/15 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div
          className="flex rounded-xl border border-border/70 bg-card/40 p-0.5"
          role="group"
          aria-label="Ver como"
        >
          {(["grid", "list"] as const).map((value) => {
            const Icon = value === "grid" ? LayoutGrid : List;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={layout === value}
                aria-label={value === "grid" ? "Ver em grade" : "Ver em lista"}
                onClick={() => chooseLayout(value)}
                className={cn(
                  "grid size-9 place-items-center rounded-lg transition-colors",
                  layout === value
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </div>

      {folderChips.length || favoritesCount ? (
        <div
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
          role="group"
          aria-label="Filtrar"
        >
          {[
            { id: "all", name: "Tudo" },
            ...(favoritesCount ? [{ id: "fav", name: "Favoritas" }] : []),
            ...folderChips,
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              aria-pressed={filter === chip.id}
              onClick={() => setFilter(chip.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === chip.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.id === "fav" ? (
                <Star className="size-3.5" />
              ) : chip.id !== "all" ? (
                <Folder className="size-3.5" />
              ) : null}
              {chip.name}
            </button>
          ))}
        </div>
      ) : null}

      {notes.isLoading ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Carregando notas"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-52 w-full rounded-2xl" />
          ))}
        </div>
      ) : notes.isError ? (
        <section
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6"
          aria-live="polite"
        >
          <h2 className="font-medium text-destructive">
            Não foi possível carregar.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => notes.refetch()}
          >
            Tentar novamente
          </Button>
        </section>
      ) : visibleNotes.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border px-6 text-center">
          <span
            className={cn(
              "grid size-14 place-items-center rounded-2xl text-white shadow-xl",
              SECTION_TONE[section].solid,
            )}
          >
            <EmptyIcon className="size-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {search || filter !== "all" ? pageCopy.notFound : pageCopy.empty}
          </h2>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
            {search || filter !== "all"
              ? "Tente outro termo ou limpe os filtros."
              : pageCopy.emptyHint}
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {groups.map((group) =>
            group.items.length ? (
              <section key={group.title} aria-label={group.title}>
                {groups.length > 1 ? (
                  <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {group.title === "Favoritas" ? (
                      <Star className="size-3.5 fill-current text-amber-400" />
                    ) : null}
                    {group.title}
                  </h2>
                ) : null}
                <ul
                  className={
                    layout === "grid"
                      ? "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"
                      : "space-y-2"
                  }
                >
                  {group.items.map((note) => (
                    <li key={note.id}>
                      {layout === "grid" ? renderCard(note) : renderRow(note)}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}

      {notePendingDeletion
        ? createPortal(
            <div
              className="fixed inset-0 z-[210] grid place-items-center p-4"
              role="presentation"
            >
              <button
                type="button"
                className="flowy-glass-scrim absolute inset-0 animate-fade-in"
                aria-label="Cancelar"
                onClick={() => setNotePendingDeletion(null)}
              />
              <div
                className="relative w-full max-w-sm flowy-glass flowy-glass-strong rounded-2xl border p-5 animate-scale-in"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-note-title"
              >
                <h2 id="delete-note-title" className="font-semibold">
                  Mover nota para a lixeira?
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  “{notePendingDeletion.title}” será movida para a lixeira. Você
                  poderá restaurá-la depois.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNotePendingDeletion(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      const noteId = notePendingDeletion.id;
                      setNotePendingDeletion(null);
                      await handleTrash(noteId);
                    }}
                  >
                    Mover para lixeira
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {templatePickerOpen ? (
        <TemplatePicker
          title="Novo mapa mental"
          busy={create.isPending}
          onPick={(template) => void handleCreate("mindmap", template)}
          onClose={closePicker}
        />
      ) : null}
    </div>
  );
}
