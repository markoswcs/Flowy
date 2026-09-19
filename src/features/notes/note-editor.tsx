"use client";

import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useQuery } from "@tanstack/react-query";
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
import { useOnlineStatus } from "@/hooks/use-online-status";
import { createClient } from "@/lib/supabase/client";
import { replaceNoteCategories } from "@/services/notes";
import type { CategorySummary, FolderSummary, Note } from "@/types/content";
import { CustomSelect } from "@/components/ui/custom-select";

interface Draft {
  title: string;
  content: JSONContent;
  plainText: string;
  folderId: string | null;
  categoryIds: string[];
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

  const folders = useQuery({
    queryKey: ["folders", "note-picker"],
    queryFn: async () => {
      const { data, error } = await client
        .from("folders")
        .select("id,name")
        .is("deleted_at", null)
        .order("position");
      if (error) throw error;
      return (data ?? []) as FolderSummary[];
    },
  });
  const categories = useQuery({
    queryKey: ["categories", "note-picker"],
    queryFn: async () => {
      const { data, error } = await client
        .from("categories")
        .select("id,name,color")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as CategorySummary[];
    },
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
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
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-24 pt-4 sm:px-8">
      <div className="relative z-50 mb-4 flex min-h-11 items-center gap-3 pb-3">
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
            ...(folders.data || []).map(f => ({ value: f.id, label: f.name, icon: <FolderIcon className="size-3.5 text-blue-500" /> }))
          ]}
          triggerIcon={<FolderIcon className="size-3.5 text-muted-foreground" />}
          className="border-0 shadow-none bg-transparent hover:bg-accent h-9"
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
            <div className="absolute left-0 top-11 z-[100] min-w-48 rounded-xl border border-border/50 bg-popover/60 p-2 shadow-xl backdrop-blur-2xl animate-in fade-in zoom-in-95">
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
        className="mb-4 w-full bg-transparent text-3xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-4xl"
        placeholder="Sem título"
        aria-label="Título da nota"
      />

      {editor && (
        <div className="sticky top-0 z-20 mb-5 flex flex-wrap items-center gap-1 bg-background/60 py-2 backdrop-blur-2xl rounded-xl px-2">
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
      <EditorContent editor={editor} />
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
