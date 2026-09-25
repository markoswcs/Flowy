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
  Palette,
  PencilLine,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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

const noteColors = ["#1f2937", "#312e81", "#4c1d3f", "#3f2a19", "#1f3d36", "#3b2f63"];

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
      className={`grid size-9 place-items-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LoadedNoteEditor({ note }: { note: Note }) {
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
  const [noteColor, setNoteColor] = useState<string | null>(draft?.color ?? note.color);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [status, setStatus] = useState<
    "saved" | "saving" | "offline" | "error"
  >(draft ? "offline" : "saved");
  const [dirty, setDirty] = useState(Boolean(draft));
  const [categoryDirty, setCategoryDirty] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [tagsOpen, setTagsOpen] = useState(false);
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
      toast("Nota movida para a lixeira.", {
        action: {
          label: "Desfazer",
          onClick: () => restore.mutate(note.id),
        },
      });
    } catch {
      toast.error("Não foi possível excluir a nota.");
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-24 pt-2 sm:px-8">
      <div className="relative z-30 mb-5 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-sm">
        <button
          type="button"
          onClick={() => router.push("/app/notes")}
          className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Voltar para notas"
        >
          <ArrowLeft className="size-4" />
        </button>
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
          className="h-9 border-border bg-background shadow-none hover:bg-accent"
        />
        <div className="relative" ref={tagsRef}>
          <button 
            type="button"
            onClick={() => setTagsOpen(!tagsOpen)} 
            className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tags <ChevronDown className={`size-3 transition-transform ${tagsOpen ? "rotate-180" : ""}`} />
          </button>
          {tagsOpen && (
            <div className="absolute left-0 top-11 z-[100] min-w-48 rounded-xl border border-border bg-popover p-2 shadow-lg animate-in fade-in zoom-in-95">
              {categories.data?.length ? (
              categories.data.map((category) => (
                <label
                  key={category.id}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-accent"
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
                    className="size-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="truncate">{category.name}</span>
                </label>
              ))
            ) : (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                Nenhuma tag
              </p>
            )}
            </div>
          )}
        </div>
        <span
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {(dirty && !isOnline ? "offline" : status) === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" /> Salvando…
            </>
          )}
          {(dirty && !isOnline ? "offline" : status) === "saved" && (
            <>
              <Check className="size-3" /> Salvo
            </>
          )}
          {(dirty && !isOnline ? "offline" : status) === "offline" &&
            "Salvo neste dispositivo"}
          {(dirty && !isOnline ? "offline" : status) === "error" && (
            <span className="text-destructive">Erro ao salvar</span>
          )}
        </span>
        <button
          type="button"
          onClick={handleTrash}
          className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Mover nota para a lixeira"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          markChanged();
        }}
        className="mb-5 w-full border-b border-transparent bg-transparent px-1 py-2 text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/40 sm:text-4xl"
        placeholder="Sem título"
        aria-label="Título da nota"
      />

      <div className="mb-5 flex items-center gap-2">
        <Palette className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs font-medium text-muted-foreground">Cor da nota</span>
        <button
          type="button"
          onClick={() => {
            setNoteColor(null);
            markChanged();
          }}
          className={`size-5 rounded-full border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${!noteColor ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
          aria-label="Sem cor"
          aria-pressed={!noteColor}
        />
        {noteColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => {
              setNoteColor(color);
              markChanged();
            }}
            className={`size-5 rounded-full border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${noteColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
            style={{ backgroundColor: color }}
            aria-label={`Usar cor ${color}`}
            aria-pressed={noteColor === color}
          />
        ))}
      </div>

      {editor && (
        <div className="sticky top-0 z-20 mb-5 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card px-2 py-2 shadow-sm">
          <ToolbarButton
            label="Título"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Negrito"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Itálico"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton
            label="Lista"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Lista numerada"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Checklist"
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <CheckSquare className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolbarButton label="Inserir desenho" onClick={() => setDrawingOpen(true)}>
            <PencilLine className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          <div className="relative">
            <ToolbarButton
              label="Adicionar link"
              active={editor.isActive("link")}
              onClick={() => setLinkOpen((open) => !open)}
            >
              <LinkIcon className="size-4" />
            </ToolbarButton>
            {linkOpen && (
              <form
                className="absolute left-0 top-11 z-30 flex w-72 gap-2 rounded-lg border border-border bg-popover p-2 shadow-lg"
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
                  className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <button className="rounded-md bg-primary px-3 text-sm text-primary-foreground">
                  Aplicar
                </button>
              </form>
            )}
          </div>
          {editor.isActive("link") && (
            <ToolbarButton
              label="Remover link"
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <Unlink className="size-4" />
            </ToolbarButton>
          )}
        </div>
      )}
      <div
        className="rounded-xl border border-border bg-card px-4 py-5 shadow-sm sm:px-8 sm:py-7 [&_.flowy-editor>h2]:mt-8 [&_.flowy-editor>h2]:text-2xl [&_.flowy-editor>h2]:font-semibold [&_.flowy-editor>p]:mb-4 [&_.flowy-editor_a]:text-primary [&_.flowy-editor_a]:underline [&_.flowy-editor_ul]:mb-4 [&_.flowy-editor_ul]:list-disc [&_.flowy-editor_ul]:pl-6 [&_.flowy-editor_ol]:mb-4 [&_.flowy-editor_ol]:list-decimal [&_.flowy-editor_ol]:pl-6"
        style={noteColor ? { backgroundColor: noteColor } : undefined}
      >
        <EditorContent editor={editor} />
      </div>
      <DrawingDialog
        open={drawingOpen}
        onClose={() => setDrawingOpen(false)}
        onSave={(src) =>
          editor
            ?.chain()
            .focus()
            .setImage({ src })
            .run()
        }
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
