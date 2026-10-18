"use client";

import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  Bold,
  Check,
  CheckSquare,
  Code,
  Ellipsis,
  Folder as FolderIcon,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  PencilLine,
  Quote,
  Redo2,
  SquareCode,
  Star,
  Strikethrough,
  Tag,
  Trash2,
  Type,
  Underline,
  Undo2,
  Unlink,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { DrawingDialog } from "@/components/notes/note-drawing";
import { CustomSelect } from "@/components/ui/custom-select";
import { useCategories } from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { SECTION_HREF } from "@/features/notes/note-sections";
import {
  useRestoreNote,
  useSaveNote,
  useToggleNoteFavorite,
  useTrashNote,
} from "@/features/notes/use-notes";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { optimizeImage } from "@/lib/image-optimizer";
import { holdOverlay } from "@/lib/overlay";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { trackVisualViewport } from "@/lib/visual-viewport";
import { notify } from "@/providers/notification-provider";
import { replaceNoteCategories } from "@/services/notes";
import type { Note } from "@/types/content";

/** Soft tints (with alpha) that read well on light and dark themes. */
const NOTE_COLORS: { name: string; value: string | null }[] = [
  { name: "Sem cor", value: null },
  { name: "Rosa", value: "#F43F5E2E" },
  { name: "Laranja", value: "#F9731630" },
  { name: "Amarelo", value: "#EAB30833" },
  { name: "Verde", value: "#22C55E2B" },
  { name: "Azul", value: "#3B82F630" },
  { name: "Roxo", value: "#8B5CF633" },
  { name: "Cinza", value: "#64748B33" },
];

const MAX_IMAGE_CHARS = 1_500_000;

const NO_MARKS = {
  h1: false,
  h2: false,
  h3: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  bullet: false,
  ordered: false,
  task: false,
  quote: false,
  codeBlock: false,
  link: false,
  canUndo: false,
  canRedo: false,
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface Draft {
  title: string;
  content: JSONContent;
  plainText: string;
  folderId: string | null;
  categoryIds: string[];
  color: string | null;
  changedAt: number;
}

function draftKey(id: string) {
  return `flowy:note-draft:${id}`;
}

function readDraft(note: Note): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(note.id));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    return draft.changedAt > new Date(note.updated_at).getTime() ? draft : null;
  } catch {
    return null;
  }
}

function countWords(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}

async function fileToDataUrl(file: File): Promise<string> {
  const optimized = await optimizeImage(file, 1280, 1280, 0.8);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.readAsDataURL(optimized);
  });
}

function BarButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-[transform,background-color,color] active:scale-90 disabled:opacity-30 motion-reduce:transform-none",
        active
          ? "bg-foreground/10 text-foreground"
          : "hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
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
      className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Fechar"
        className="flowy-glass-scrim absolute inset-0 animate-fade-in"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flowy-glass flowy-glass-strong relative max-h-[85dvh] w-full max-w-md animate-in overflow-y-auto overscroll-contain rounded-t-[1.75rem] border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] fade-in slide-in-from-bottom-6 sm:rounded-3xl"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

/** Shortcuts shown on an empty note (Samsung Notes style). */
function QuickStarts({
  onChecklist,
  onHeading,
  onImage,
  onDrawing,
}: {
  onChecklist: () => void;
  onHeading: () => void;
  onImage: () => void;
  onDrawing: () => void;
}) {
  const items = [
    { icon: CheckSquare, label: "Checklist", run: onChecklist },
    { icon: Heading2, label: "Título", run: onHeading },
    { icon: ImagePlus, label: "Imagem", run: onImage },
    { icon: PencilLine, label: "Desenho", run: onDrawing },
  ];
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.run}
          className="flex min-h-10 items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <item.icon className="flowy-ink size-4" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

const SHEET_LABEL =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

export function TextNoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { mutateAsync: saveNote } = useSaveNote(note.id);
  const trash = useTrashNote();
  const restore = useRestoreNote();
  const toggleFavorite = useToggleNoteFavorite();
  const client = useMemo(() => createClient(), []);
  const draft = useMemo(() => readDraft(note), [note]);
  // The default "Sem título" is shown as the placeholder, not as typed text.
  const [title, setTitle] = useState(() => {
    const initial = draft?.title ?? note.title;
    return initial === "Sem título" ? "" : initial;
  });
  const [folderId, setFolderId] = useState<string | null>(
    draft?.folderId ?? note.folder_id,
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(
    draft?.categoryIds ?? note.categories?.map((category) => category.id) ?? [],
  );
  const [content, setContent] = useState<JSONContent>(
    draft?.content ?? note.content,
  );
  const [plainText, setPlainText] = useState(
    draft?.plainText ?? note.plain_text,
  );
  const [noteColor, setNoteColor] = useState<string | null>(
    draft?.color ?? note.color,
  );
  const [favorite, setFavorite] = useState(note.is_favorite);
  const [status, setStatus] = useState<
    "saved" | "saving" | "offline" | "error"
  >(draft ? "offline" : "saved");
  const [dirty, setDirty] = useState(Boolean(draft));
  const [categoryDirty, setCategoryDirty] = useState(false);
  const [sheet, setSheet] = useState<"text" | "link" | "more" | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [editedAt, setEditedAt] = useState(() => new Date(note.updated_at));
  const imageInput = useRef<HTMLInputElement>(null);
  const version = useRef(0);

  const folders = useFolders();
  const categories = useCategories();

  // Keeps the formatting bar above the on-screen keyboard.
  useEffect(() => trackVisualViewport(), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true },
      }),
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "flowy-editor-image" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Comece a escrever…" }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "flowy-editor min-h-[5rem] max-w-none focus:outline-none",
        "aria-label": "Conteúdo da nota",
      },
    },
    onUpdate: ({
      editor: current,
    }: {
      editor: { getJSON: () => JSONContent; getText: () => string };
    }) => {
      setContent(current.getJSON());
      setPlainText(current.getText());
      markChanged();
    },
  });

  // TipTap 3 does not re-render on every transaction: read toolbar state here.
  // It stays null until the first transaction, so start from "nothing active".
  const marks =
    useEditorState({
      editor,
      selector: ({ editor: current }) =>
        current
          ? {
              h1: current.isActive("heading", { level: 1 }),
              h2: current.isActive("heading", { level: 2 }),
              h3: current.isActive("heading", { level: 3 }),
              bold: current.isActive("bold"),
              italic: current.isActive("italic"),
              underline: current.isActive("underline"),
              strike: current.isActive("strike"),
              code: current.isActive("code"),
              bullet: current.isActive("bulletList"),
              ordered: current.isActive("orderedList"),
              task: current.isActive("taskList"),
              quote: current.isActive("blockquote"),
              codeBlock: current.isActive("codeBlock"),
              link: current.isActive("link"),
              canUndo: current.can().undo(),
              canRedo: current.can().redo(),
            }
          : null,
    }) ?? NO_MARKS;

  useEffect(() => {
    if (!dirty || !editor) return;
    const currentVersion = version.current;
    const pendingDraft: Draft = {
      title,
      content,
      plainText,
      folderId,
      categoryIds,
      color: noteColor,
      changedAt: Date.now(),
    };
    try {
      localStorage.setItem(draftKey(note.id), JSON.stringify(pendingDraft));
    } catch {
      // Storage full (big images): the server save below still runs.
    }

    if (!isOnline) return;

    const timeout = window.setTimeout(async () => {
      try {
        await saveNote({
          title: title.trim() || "Sem título",
          content,
          plain_text: plainText,
          folder_id: folderId,
          color: noteColor,
        });
        if (categoryDirty) {
          await replaceNoteCategories(client, note.id, categoryIds);
          setCategoryDirty(false);
        }
        if (currentVersion === version.current) {
          setDirty(false);
          setStatus("saved");
          setEditedAt(new Date());
          localStorage.removeItem(draftKey(note.id));
        }
      } catch {
        setStatus("error");
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [
    categoryDirty,
    categoryIds,
    client,
    content,
    dirty,
    editor,
    folderId,
    isOnline,
    note.id,
    noteColor,
    plainText,
    saveNote,
    title,
  ]);

  function markChanged() {
    version.current += 1;
    setDirty(true);
    setStatus("saving");
  }

  function applyLink() {
    if (!editor) return;
    const href = linkValue.trim();
    if (!href) return;
    const safeHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: safeHref })
      .run();
    setSheet(null);
    setLinkValue("");
  }

  function openImagePicker() {
    imageInput.current?.click();
  }

  async function insertImage(file: File) {
    try {
      const src = await fileToDataUrl(file);
      if (src.length > MAX_IMAGE_CHARS)
        return toast.error("Imagem grande demais. Tente uma menor.");
      editor?.chain().focus().setImage({ src }).run();
    } catch {
      toast.error("Não foi possível adicionar a imagem.");
    }
  }

  async function handleFavorite() {
    const next = !favorite;
    setFavorite(next);
    try {
      await toggleFavorite.mutateAsync({ noteId: note.id, isFavorite: next });
    } catch {
      setFavorite(!next);
      toast.error("Não foi possível atualizar o favorito.");
    }
  }

  async function handleTrash() {
    try {
      await trash.mutateAsync(note.id);
      router.push(SECTION_HREF.nota);
      notify("Nota movida para a lixeira", {
        action: {
          label: "Desfazer",
          onClick: () => restore.mutate(note.id),
        },
      });
    } catch {
      toast.error("Não foi possível excluir a nota.");
    }
  }

  const saveState = dirty && !isOnline ? "offline" : status;
  const selectedLabels = (categories.data ?? []).filter((category) =>
    categoryIds.includes(category.id),
  );
  const folder = (folders.data ?? []).find((item) => item.id === folderId);
  const words = countWords(plainText);
  const chain = () => editor?.chain().focus();

  return (
    <div
      className="flowy-text-editor relative min-h-full w-full transition-colors duration-500"
      style={noteColor ? { backgroundColor: noteColor } : undefined}
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 pb-36 sm:px-10 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem] md:border md:border-border/60 md:bg-card/40 md:shadow-[0_30px_80px_-40px_rgb(0_0_0/0.5)] md:backdrop-blur-sm">
        <header className="sticky top-0 z-30 -mx-5 flex h-14 items-center gap-1 bg-background/70 px-2 backdrop-blur-xl sm:-mx-10 sm:px-6 md:rounded-t-[2rem] md:bg-transparent">
          <button
            type="button"
            onClick={() => router.push(SECTION_HREF.nota)}
            className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Voltar para notas"
          >
            <ArrowLeft className="size-5" />
          </button>
          <span
            className={cn(
              "ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              saveState === "error"
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground",
            )}
            aria-live="polite"
          >
            {saveState === "saving" ? (
              <>
                <Loader2 className="size-3 animate-spin" /> Salvando
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="size-3 text-success" /> Salvo
              </>
            ) : saveState === "offline" ? (
              "Salvo no aparelho"
            ) : (
              "Erro ao salvar"
            )}
          </span>
          <button
            type="button"
            onClick={() => void handleFavorite()}
            aria-pressed={favorite}
            aria-label={favorite ? "Remover dos favoritos" : "Favoritar"}
            className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Star
              className={cn(
                "size-5",
                favorite && "fill-amber-400 text-amber-400",
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => setSheet("more")}
            aria-label="Mais opções da nota"
            className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Ellipsis className="size-5" />
          </button>
        </header>

        <textarea
          value={title}
          rows={1}
          onChange={(event) => {
            setTitle(event.target.value.replace(/\n/g, " "));
            markChanged();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              editor?.commands.focus("start");
            }
          }}
          className="mt-3 w-full resize-none border-0 bg-transparent p-0 focus:ring-0 text-[1.75rem] font-bold leading-tight tracking-tight outline-none [field-sizing:content] placeholder:text-muted-foreground/50 sm:mt-6 sm:text-4xl"
          placeholder="Título"
          aria-label="Título da nota"
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          <time dateTime={editedAt.toISOString()}>
            {dateFormatter.format(editedAt)}
          </time>
          <span aria-hidden="true">·</span>
          <span>
            {words} {words === 1 ? "palavra" : "palavras"}
          </span>
          {folder ? (
            <button
              type="button"
              onClick={() => setSheet("more")}
              className="flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-1 hover:text-foreground"
            >
              <FolderIcon
                className="size-3"
                style={{ color: folder.color ?? undefined }}
              />
              {folder.name}
            </button>
          ) : null}
          {selectedLabels.map((label) => (
            <button
              key={label.id}
              type="button"
              onClick={() => setSheet("more")}
              className="flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 py-1 hover:text-foreground"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              {label.name}
            </button>
          ))}
        </div>

        {/* The empty space below the text keeps focusing the editor. */}
        <div
          className="mt-6 flex-1 cursor-text"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return;
            event.preventDefault();
            editor?.commands.focus("end");
          }}
        >
          <EditorContent editor={editor} />
          {editor && editor.isEmpty ? (
            <QuickStarts
              onChecklist={() => chain()?.toggleTaskList().run()}
              onHeading={() => chain()?.toggleHeading({ level: 2 }).run()}
              onImage={openImagePicker}
              onDrawing={() => setDrawingOpen(true)}
            />
          ) : null}
          {editor ? (
            <BubbleMenu
              editor={editor}
              options={{ placement: "top", offset: 8 }}
              className="flowy-glass flowy-glass-strong flex items-center gap-0.5 rounded-2xl border p-1 shadow-xl"
            >
              <BarButton
                icon={Bold}
                label="Negrito"
                active={marks.bold}
                onClick={() => chain()?.toggleBold().run()}
              />
              <BarButton
                icon={Italic}
                label="Itálico"
                active={marks.italic}
                onClick={() => chain()?.toggleItalic().run()}
              />
              <BarButton
                icon={Underline}
                label="Sublinhado"
                active={marks.underline}
                onClick={() => chain()?.toggleUnderline().run()}
              />
              <BarButton
                icon={Strikethrough}
                label="Riscado"
                active={marks.strike}
                onClick={() => chain()?.toggleStrike().run()}
              />
              <BarButton
                icon={Code}
                label="Código"
                active={marks.code}
                onClick={() => chain()?.toggleCode().run()}
              />
              <span className="mx-0.5 h-6 w-px bg-border" />
              <BarButton
                icon={Heading2}
                label="Título"
                active={marks.h2}
                onClick={() => chain()?.toggleHeading({ level: 2 }).run()}
              />
              <BarButton
                icon={marks.link ? Unlink : LinkIcon}
                label={marks.link ? "Remover link" : "Adicionar link"}
                active={marks.link}
                onClick={() =>
                  marks.link ? chain()?.unsetLink().run() : setSheet("link")
                }
              />
            </BubbleMenu>
          ) : null}
        </div>
      </div>

      {editor ? (
        <div
          className="flowy-note-toolbar fixed left-1/2 z-40 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2"
          role="toolbar"
          aria-label="Formatação"
        >
          <div className="flowy-glass flowy-glass-strong flex items-center gap-0.5 overflow-x-auto rounded-[1.4rem] border p-1.5 [scrollbar-width:none]">
            <BarButton
              icon={Type}
              label="Estilos de texto"
              active={sheet === "text"}
              onClick={() => setSheet(sheet === "text" ? null : "text")}
            />
            <BarButton
              icon={CheckSquare}
              label="Lista de tarefas"
              active={marks.task}
              onClick={() => chain()?.toggleTaskList().run()}
            />
            <BarButton
              icon={List}
              label="Lista"
              active={marks.bullet}
              onClick={() => chain()?.toggleBulletList().run()}
            />
            <BarButton
              icon={ImagePlus}
              label="Inserir imagem"
              onClick={openImagePicker}
            />
            <BarButton
              icon={PencilLine}
              label="Inserir desenho à mão"
              onClick={() => setDrawingOpen(true)}
            />
            <BarButton
              icon={marks.link ? Unlink : LinkIcon}
              label={marks.link ? "Remover link" : "Adicionar link"}
              active={marks.link}
              onClick={() =>
                marks.link ? chain()?.unsetLink().run() : setSheet("link")
              }
            />
            <span className="mx-1 h-6 w-px shrink-0 bg-border" />
            <BarButton
              icon={Undo2}
              label="Desfazer"
              disabled={!marks.canUndo}
              onClick={() => chain()?.undo().run()}
            />
            <BarButton
              icon={Redo2}
              label="Refazer"
              disabled={!marks.canRedo}
              onClick={() => chain()?.redo().run()}
            />
          </div>
        </div>
      ) : null}

      {sheet === "text" && editor ? (
        <Sheet title="Estilos de texto" onClose={() => setSheet(null)}>
          <p className={SHEET_LABEL}>Parágrafo</p>
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {[
              {
                label: "Título",
                active: marks.h1,
                size: "text-xl font-bold",
                run: () => chain()?.toggleHeading({ level: 1 }).run(),
              },
              {
                label: "Subtítulo",
                active: marks.h2,
                size: "text-lg font-semibold",
                run: () => chain()?.toggleHeading({ level: 2 }).run(),
              },
              {
                label: "Cabeçalho",
                active: marks.h3,
                size: "text-base font-semibold",
                run: () => chain()?.toggleHeading({ level: 3 }).run(),
              },
              {
                label: "Corpo",
                active: !marks.h1 && !marks.h2 && !marks.h3,
                size: "text-sm",
                run: () => chain()?.setParagraph().run(),
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                role="radio"
                aria-checked={item.active}
                onClick={item.run}
                className={cn(
                  "min-h-12 rounded-2xl bg-muted/40 px-3 text-left",
                  item.size,
                  item.active && "bg-foreground/10",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className={SHEET_LABEL}>Texto</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            <BarButton
              icon={Bold}
              label="Negrito"
              active={marks.bold}
              onClick={() => chain()?.toggleBold().run()}
            />
            <BarButton
              icon={Italic}
              label="Itálico"
              active={marks.italic}
              onClick={() => chain()?.toggleItalic().run()}
            />
            <BarButton
              icon={Underline}
              label="Sublinhado"
              active={marks.underline}
              onClick={() => chain()?.toggleUnderline().run()}
            />
            <BarButton
              icon={Strikethrough}
              label="Riscado"
              active={marks.strike}
              onClick={() => chain()?.toggleStrike().run()}
            />
            <BarButton
              icon={Code}
              label="Código"
              active={marks.code}
              onClick={() => chain()?.toggleCode().run()}
            />
          </div>
          <p className={SHEET_LABEL}>Blocos</p>
          <div className="flex flex-wrap gap-1.5">
            <BarButton
              icon={List}
              label="Lista"
              active={marks.bullet}
              onClick={() => chain()?.toggleBulletList().run()}
            />
            <BarButton
              icon={ListOrdered}
              label="Lista numerada"
              active={marks.ordered}
              onClick={() => chain()?.toggleOrderedList().run()}
            />
            <BarButton
              icon={CheckSquare}
              label="Lista de tarefas"
              active={marks.task}
              onClick={() => chain()?.toggleTaskList().run()}
            />
            <BarButton
              icon={Quote}
              label="Citação"
              active={marks.quote}
              onClick={() => chain()?.toggleBlockquote().run()}
            />
            <BarButton
              icon={SquareCode}
              label="Bloco de código"
              active={marks.codeBlock}
              onClick={() => chain()?.toggleCodeBlock().run()}
            />
            <BarButton
              icon={Minus}
              label="Divisor"
              onClick={() => chain()?.setHorizontalRule().run()}
            />
          </div>
        </Sheet>
      ) : null}

      {sheet === "link" ? (
        <Sheet title="Adicionar link" onClose={() => setSheet(null)}>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <input
              autoFocus
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              placeholder="https://…"
              aria-label="Endereço do link"
              inputMode="url"
              className="h-12 min-w-0 flex-1 rounded-2xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Aplicar
            </button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Selecione um trecho do texto antes para transformá-lo em link.
          </p>
        </Sheet>
      ) : null}

      {sheet === "more" ? (
        <Sheet title="Nota" onClose={() => setSheet(null)}>
          <p className={SHEET_LABEL}>Pasta</p>
          <CustomSelect
            value={folderId ?? ""}
            onChange={(value) => {
              setFolderId(value || null);
              markChanged();
            }}
            placeholder="Sem pasta"
            options={[
              { value: "", label: "Sem pasta" },
              ...(folders.data ?? []).map((item) => ({
                value: item.id,
                label: item.name,
                icon: (
                  <FolderIcon
                    className="size-3.5"
                    style={{ color: item.color ?? undefined }}
                  />
                ),
              })),
            ]}
            triggerIcon={
              <FolderIcon className="size-4 text-muted-foreground" />
            }
            className="mb-5 h-12 w-full rounded-2xl"
          />
          <p className={SHEET_LABEL}>Etiquetas</p>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {categories.data?.length ? (
              categories.data.map((category) => {
                const on = categoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setCategoryIds((current) =>
                        current.includes(category.id)
                          ? current.filter((id) => id !== category.id)
                          : [...current, category.id],
                      );
                      setCategoryDirty(true);
                      markChanged();
                    }}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm",
                      on
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </button>
                );
              })
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="size-4" /> Nenhuma etiqueta. Crie uma pelo menu
                lateral.
              </p>
            )}
          </div>
          <p className={SHEET_LABEL}>Cor da nota</p>
          <div
            role="radiogroup"
            aria-label="Cor da nota"
            className="mb-6 flex flex-wrap gap-2"
          >
            {NOTE_COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                role="radio"
                aria-checked={noteColor === color.value}
                aria-label={color.name}
                title={color.name}
                onClick={() => {
                  setNoteColor(color.value);
                  markChanged();
                }}
                className="grid size-10 place-items-center rounded-full border border-border"
                style={{ backgroundColor: color.value ?? "hsl(var(--card))" }}
              >
                {noteColor === color.value ? (
                  <Check className="size-4" />
                ) : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setSheet(null);
              void handleTrash();
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" /> Mover para a lixeira
          </button>
        </Sheet>
      ) : null}

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void insertImage(file);
        }}
      />
      <DrawingDialog
        open={drawingOpen}
        onClose={() => setDrawingOpen(false)}
        onSave={(src) => editor?.chain().focus().setImage({ src }).run()}
      />
    </div>
  );
}
