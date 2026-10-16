"use client";

import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlertTriangle,
  ArrowLeft,
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Trash2,
  Unlink,
  Folder as FolderIcon,
  Tag,
  PencilLine,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { toast } from "@/lib/toast";
import { notify } from "@/providers/notification-provider";

import {
  useNote,
  useRestoreNote,
  useSaveNote,
  useTrashNote,
} from "@/features/notes/use-notes";
import { useCategories } from "@/features/categories/use-categories";
import { useFolders } from "@/features/folders/use-folders";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { createClient } from "@/lib/supabase/client";
import { replaceNoteCategories } from "@/services/notes";
import type { Note } from "@/types/content";
import { CustomSelect } from "@/components/ui/custom-select";
import { DrawingDialog } from "@/components/notes/note-drawing";

const ExcalidrawNoteEditor = dynamic(
  () => import("@/components/notes/excalidraw-note-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">
        Carregando editor de fluxograma…
      </div>
    ),
  },
);

const MindmapNoteEditor = dynamic(
  () => import("@/components/notes/mindmap-note-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-4xl p-8 text-sm text-muted-foreground">
        Carregando mapa mental…
      </div>
    ),
  },
);

interface EditorErrorBoundaryProps {
  children: ReactNode;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  retryKey: number;
  errorMessage: string | null;
}

class EditorErrorBoundary extends Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  state: EditorErrorBoundaryState = {
    hasError: false,
    retryKey: 0,
    errorMessage: null,
  };

  static getDerivedStateFromError(
    error: unknown,
  ): Partial<EditorErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error ? error.message : "Erro desconhecido no editor",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Flowy] Falha no editor de fluxograma", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="mx-auto flex min-h-[52dvh] w-full max-w-lg flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-card px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            O editor precisa ser recarregado
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            O fluxograma não foi apagado. Tente carregar o editor novamente.
          </p>
          <button
            type="button"
            onClick={() =>
              this.setState((current) => ({
                hasError: false,
                retryKey: current.retryKey + 1,
                errorMessage: null,
              }))
            }
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Recarregar editor
          </button>
          {this.state.errorMessage ? (
            <details className="mt-5 w-full text-left text-xs text-muted-foreground">
              <summary className="cursor-pointer text-center hover:text-foreground">
                Ver detalhe técnico
              </summary>
              <code className="mt-2 block max-h-24 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3">
                {this.state.errorMessage}
              </code>
            </details>
          ) : null}
        </section>
      );
    }

    return (
      <div key={this.state.retryKey} className="h-full min-h-0">
        {this.props.children}
      </div>
    );
  }
}

const noteColors = [
  "#1f2937",
  "#312e81",
  "#4c1d3f",
  "#3f2a19",
  "#1f3d36",
  "#3b2f63",
];

interface Draft {
  title: string;
  content: JSONContent;
  plainText: string;
  folderId: string | null;
  categoryIds: string[];
  color: string | null;
  changedAt: number;
}

function readDraft(note: Note): Draft | null {
  try {
    const raw = localStorage.getItem(`flowy:note-draft:${note.id}`);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    return draft.changedAt > new Date(note.updated_at).getTime() ? draft : null;
  } catch {
    return null;
  }
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid size-10 shrink-0 place-items-center rounded-xl transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LoadedNoteEditor({ note }: { note: Note }) {
  if (note.kind === "mindmap") {
    return (
      <EditorErrorBoundary>
        <MindmapNoteEditor note={note} />
      </EditorErrorBoundary>
    );
  }

  if (note.kind === "excalidraw") {
    return (
      <EditorErrorBoundary>
        <ExcalidrawNoteEditor note={note} />
      </EditorErrorBoundary>
    );
  }
  return <TextNoteEditor note={note} />;
}

function TextNoteEditor({ note }: { note: Note }) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { mutateAsync: saveNote } = useSaveNote(note.id);
  const trash = useTrashNote();
  const restore = useRestoreNote();
  const client = useMemo(() => createClient(), []);
  const draft = useMemo(() => readDraft(note), [note]);
  const [title, setTitle] = useState(draft?.title ?? note.title);
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
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [status, setStatus] = useState<
    "saved" | "saving" | "offline" | "error"
  >(draft ? "offline" : "saved");
  const [dirty, setDirty] = useState(Boolean(draft));
  const [categoryDirty, setCategoryDirty] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [tagsOpen, setTagsOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const tagsRef = useRef<HTMLDivElement>(null);
  const version = useRef(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagsRef.current && !tagsRef.current.contains(event.target as Node)) {
        setTagsOpen(false);
      }
    }
    if (tagsOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tagsOpen]);

  const folders = useFolders();
  const categories = useCategories();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "my-4 max-w-full rounded-lg border border-border",
        },
      }),
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Comece a escrever…" }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "flowy-editor min-h-[52vh] max-w-none focus:outline-none text-foreground leading-7",
        "aria-label": "Conteúdo da nota",
      },
    },
    onUpdate: ({
      editor: currentEditor,
    }: {
      editor: { getJSON: () => JSONContent; getText: () => string };
    }) => {
      setContent(currentEditor.getJSON());
      setPlainText(currentEditor.getText());
      version.current += 1;
      setDirty(true);
      setStatus("saving");
    },
  });

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
    localStorage.setItem(
      `flowy:note-draft:${note.id}`,
      JSON.stringify(pendingDraft),
    );

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
          localStorage.removeItem(`flowy:note-draft:${note.id}`);
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
    setLinkOpen(false);
    setLinkValue("");
  }

  async function handleTrash() {
    try {
      await trash.mutateAsync(note.id);
      router.push("/app/notes");
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

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 pb-32 sm:px-8 md:pb-28">
      <header className="sticky top-0 z-30 -mx-4 flex h-14 items-center gap-1 bg-background/85 px-2 backdrop-blur-xl sm:-mx-8 sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/app/notes")}
          className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Voltar para notas"
        >
          <ArrowLeft className="size-5" />
        </button>
        <span
          className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            saveState === "error"
              ? "bg-destructive/10 text-destructive"
              : "text-muted-foreground"
          }`}
          aria-live="polite"
        >
          {saveState === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" /> Salvando
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="size-3 text-success" /> Salvo
            </>
          )}
          {saveState === "offline" && "Salvo no aparelho"}
          {saveState === "error" && "Erro ao salvar"}
        </span>
        <button
          type="button"
          onClick={handleTrash}
          className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Mover nota para a lixeira"
        >
          <Trash2 className="size-[18px]" />
        </button>
      </header>

      <input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          markChanged();
        }}
        className="mt-2 w-full bg-transparent px-1 text-[1.75rem] font-bold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50 sm:mt-4 sm:text-4xl"
        placeholder="Sem título"
        aria-label="Título da nota"
      />

      <div className="relative z-20 mb-5 mt-3 flex flex-wrap items-center gap-2 px-1">
        <CustomSelect
          value={folderId ?? ""}
          onChange={(v) => {
            setFolderId(v || null);
            markChanged();
          }}
          placeholder="Sem pasta"
          options={[
            { value: "", label: "Sem pasta" },
            ...(folders.data || []).map((folder) => ({
              value: folder.id,
              label: folder.name,
              icon: (
                <FolderIcon
                  className="size-3.5"
                  style={{ color: folder.color ?? undefined }}
                />
              ),
            })),
          ]}
          triggerIcon={<FolderIcon className="size-3.5 text-muted-foreground" />}
          className="h-8 rounded-full border-border/60 bg-card/60 px-3 text-xs shadow-none hover:bg-accent"
        />

        <div className="relative" ref={tagsRef}>
          <button
            type="button"
            onClick={() => setTagsOpen(!tagsOpen)}
            aria-expanded={tagsOpen}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Tag className="size-3.5" aria-hidden="true" />
            {selectedLabels.length ? (
              <span className="flex items-center gap-1.5 text-foreground">
                {selectedLabels.slice(0, 2).map((label) => (
                  <span key={label.id} className="flex items-center gap-1">
                    <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                    <span className="max-w-24 truncate">{label.name}</span>
                  </span>
                ))}
                {selectedLabels.length > 2 ? <span>+{selectedLabels.length - 2}</span> : null}
              </span>
            ) : (
              "Etiquetas"
            )}
            <ChevronDown
              className={`size-3 transition-transform ${tagsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {tagsOpen && (
            <div className="absolute left-0 top-10 z-[100] min-w-52 rounded-2xl border border-border bg-popover p-1.5 shadow-xl animate-in fade-in zoom-in-95">
              {categories.data?.length ? (
                categories.data.map((category) => (
                  <label
                    key={category.id}
                    className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={categoryIds.includes(category.id)}
                      onChange={() => {
                        setCategoryIds((current) =>
                          current.includes(category.id)
                            ? current.filter((id) => id !== category.id)
                            : [...current, category.id],
                        );
                        setCategoryDirty(true);
                        markChanged();
                      }}
                      className="size-4 rounded-sm border-border bg-background text-primary focus:ring-primary focus:ring-offset-background"
                    />
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="truncate">{category.name}</span>
                  </label>
                ))
              ) : (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  Nenhuma etiqueta. Crie uma pelo menu lateral.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setColorOpen((open) => !open)}
            aria-expanded={colorOpen}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className="size-3.5 rounded-full border border-white/15"
              style={{ backgroundColor: noteColor ?? "hsl(var(--card))" }}
              aria-hidden="true"
            />
            Cor
          </button>
          {colorOpen && (
            <div className="absolute left-0 top-10 z-[100] flex gap-2 rounded-2xl border border-border bg-popover p-2.5 shadow-xl animate-in fade-in zoom-in-95">
              <button
                type="button"
                onClick={() => {
                  setNoteColor(null);
                  setColorOpen(false);
                  markChanged();
                }}
                className={`size-7 rounded-full border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!noteColor ? "ring-2 ring-primary ring-offset-2 ring-offset-popover" : ""}`}
                aria-label="Sem cor"
                aria-pressed={!noteColor}
              />
              {noteColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    setNoteColor(color);
                    setColorOpen(false);
                    markChanged();
                  }}
                  className={`size-7 rounded-full border border-white/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${noteColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-popover" : ""}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Usar cor ${color}`}
                  aria-pressed={noteColor === color}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-1 rounded-[1.75rem] px-5 py-6 transition-colors duration-500 sm:px-9 sm:py-8 [&_.flowy-editor>h2]:mt-8 [&_.flowy-editor>h2]:text-2xl [&_.flowy-editor>h2]:font-semibold [&_.flowy-editor>p]:mb-3 [&_.flowy-editor_a]:text-primary [&_.flowy-editor_a]:underline [&_.flowy-editor_ul]:mb-4 [&_.flowy-editor_ul]:list-disc [&_.flowy-editor_ul]:pl-6 [&_.flowy-editor_ol]:mb-4 [&_.flowy-editor_ol]:list-decimal [&_.flowy-editor_ol]:pl-6"
        style={{ backgroundColor: noteColor ?? "hsl(var(--card) / 0.45)" }}
      >
        <EditorContent editor={editor} />
      </div>

      {editor && (
        <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-lg">
          {linkOpen && (
            <form
              className="mb-2 flex gap-2 rounded-2xl border border-border bg-popover p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyLink();
              }}
            >
              <label className="sr-only" htmlFor="note-link">
                Endereço do link
              </label>
              <input
                id="note-link"
                autoFocus
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                placeholder="https://…"
                className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button className="rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
                Aplicar
              </button>
            </form>
          )}
          <div
            className="flex items-center gap-0.5 overflow-x-auto rounded-[1.25rem] border border-border/70 bg-card/90 p-1.5 shadow-[0_18px_50px_-15px_rgb(0_0_0/0.6)] backdrop-blur-xl [scrollbar-width:none]"
            role="toolbar"
            aria-label="Formatação"
          >
            <ToolbarButton
              label="Título"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="size-[18px]" />
            </ToolbarButton>
            <ToolbarButton
              label="Negrito"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="size-[18px]" />
            </ToolbarButton>
            <ToolbarButton
              label="Itálico"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="size-[18px]" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px shrink-0 bg-border" />
            <ToolbarButton
              label="Lista"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="size-[18px]" />
            </ToolbarButton>
            <ToolbarButton
              label="Lista numerada"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="size-[18px]" />
            </ToolbarButton>
            <ToolbarButton
              label="Lista de verificação"
              active={editor.isActive("taskList")}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
            >
              <CheckSquare className="size-[18px]" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px shrink-0 bg-border" />
            <ToolbarButton label="Inserir desenho" onClick={() => setDrawingOpen(true)}>
              <PencilLine className="size-[18px]" />
            </ToolbarButton>
            <ToolbarButton
              label="Adicionar link"
              active={editor.isActive("link") || linkOpen}
              onClick={() => setLinkOpen((open) => !open)}
            >
              <LinkIcon className="size-[18px]" />
            </ToolbarButton>
            {editor.isActive("link") && (
              <ToolbarButton
                label="Remover link"
                onClick={() => editor.chain().focus().unsetLink().run()}
              >
                <Unlink className="size-[18px]" />
              </ToolbarButton>
            )}
          </div>
        </div>
      )}
      <DrawingDialog
        open={drawingOpen}
        onClose={() => setDrawingOpen(false)}
        onSave={(src) => editor?.chain().focus().setImage({ src }).run()}
      />
    </div>
  );
}

export function NoteEditor({ noteId }: { noteId: string }) {
  const note = useNote(noteId);
  if (note.isLoading)
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  if (note.isError || !note.data)
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não foi possível abrir esta nota.
        </p>
        <button
          onClick={() => note.refetch()}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  return <LoadedNoteEditor key={note.data.id} note={note.data} />;
}
