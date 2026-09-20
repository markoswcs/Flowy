"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Folder as FolderIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCreateFolder,
  useFolders,
  useReorderFolders,
  useRestoreFolder,
  useSoftDeleteFolder,
  useUpdateFolder,
} from "@/features/folders/use-folders";
import { ORGANIZER_COLORS } from "@/lib/color-palette";
import { normalizedPositions } from "@/lib/positions";
import type { Folder, UpdateFolderInput } from "@/types/productivity";

const DEFAULT_FOLDER_COLOR = ORGANIZER_COLORS[0].value;

function resolveFolderColor(color: string | null): string {
  return (
    ORGANIZER_COLORS.find(
      (option) => option.value.toLowerCase() === color?.toLowerCase(),
    )?.value ??
    color ??
    DEFAULT_FOLDER_COLOR
  );
}

function eligibleParentFolders(folders: Folder[], folderId: string) {
  // If the folder has any children, it cannot be put inside another folder (to prevent 3-level nesting)
  const hasChildren = folders.some((f) => f.parent_id === folderId);
  if (hasChildren) return [];

  // Otherwise, it can only be placed in a root folder (parent_id === null)
  return folders.filter((f) => f.id !== folderId && f.parent_id === null);
}

interface FolderEditorProps {
  folder: Folder;
  folders: Folder[];
  isSaving: boolean;
  onSave: (input: UpdateFolderInput) => void;
  onCancel: () => void;
}

function FolderEditor({
  folder,
  folders,
  isSaving,
  onSave,
  onCancel,
}: FolderEditorProps) {
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState<string>(resolveFolderColor(folder.color));
  const [parentId, setParentId] = useState(folder.parent_id ?? "");
  const eligibleParents = useMemo(
    () => eligibleParentFolders(folders, folder.id),
    [folder.id, folders],
  );

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: folder.id,
      name,
      color,
      parent_id: parentId || null,
    });
  }

  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <div>
        <h3 className="font-semibold">Editar pasta</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Altere o nome, a cor ou o local desta pasta.
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Nome</span>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Trabalho, Estudos ou Pessoal"
          aria-label={"Nome de " + folder.name}
          autoFocus
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Cor da pasta</legend>
        <div className="flex flex-wrap gap-2">
          {ORGANIZER_COLORS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setColor(option.value)}
              className={
                "grid size-9 place-items-center rounded-lg border transition-transform hover:scale-105 " +
                (color === option.value
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border")
              }
              aria-label={"Escolher " + option.name}
              aria-pressed={color === option.value}
            >
              <FolderIcon className="size-5" style={{ color: option.value }} />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Local</span>
        <select
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          className="min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          aria-label={"Local de " + folder.name}
        >
          <option value="">Nível principal</option>
          {eligibleParents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              Dentro de {parent.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={isSaving} disabled={!name.trim()}>
          Salvar alterações
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

interface FolderManagerProps {
  autoFocusNew?: boolean;
  initialEditId?: string | null;
}

export function FolderManager({
  autoFocusNew = false,
  initialEditId = null,
}: FolderManagerProps) {
  const { data: rawFolders, ...foldersQuery } = useFolders();
  const folders = useMemo(() => rawFolders ?? [], [rawFolders]);
  const createMutation = useCreateFolder();
  const updateMutation = useUpdateFolder();
  const reorderMutation = useReorderFolders();
  const deleteMutation = useSoftDeleteFolder();
  const restoreMutation = useRestoreFolder();
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_FOLDER_COLOR);
  const [parentId, setParentId] = useState("");
  const [manualEditingId, setManualEditingId] = useState<string | null>(null);
  const [dismissedInitialEditId, setDismissedInitialEditId] = useState<
    string | null
  >(null);

  const editingId =
    manualEditingId ??
    (initialEditId && initialEditId !== dismissedInitialEditId
      ? initialEditId
      : null);
  const editingFolder =
    folders.find((folder) => folder.id === editingId) ?? null;

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate(
      { name, color, parent_id: parentId || null },
      {
        onSuccess: () => {
          setName("");
          setColor(DEFAULT_FOLDER_COLOR);
          setParentId("");
          toast.success("Pasta criada.");
        },
      },
    );
  }

  function beginEditing(folder: Folder) {
    setDismissedInitialEditId(initialEditId);
    setManualEditingId(folder.id);
  }

  function cancelEditing() {
    if (manualEditingId) {
      setManualEditingId(null);
      return;
    }

    setDismissedInitialEditId(initialEditId);
  }

  function saveEditing(input: UpdateFolderInput) {
    updateMutation.mutate(
      input,
      {
        onSuccess: () => {
          cancelEditing();
          toast.success("Pasta atualizada.");
        },
      },
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= folders.length) return;

    const reordered = [...folders];
    const [folder] = reordered.splice(index, 1);
    if (!folder) return;

    reordered.splice(target, 0, folder);
    const positions = normalizedPositions(reordered.length);
    reorderMutation.mutate(
      reordered.map((item, itemIndex) => ({
        ...item,
        position: positions[itemIndex] ?? (itemIndex + 1) * 1_000,
      })),
    );
  }

  function remove(folder: Folder) {
    deleteMutation.mutate(folder.id, {
      onSuccess: () => {
        if (editingId === folder.id) cancelEditing();
        toast("Pasta movida para a lixeira.", {
          action: {
            label: "Desfazer",
            onClick: () => restoreMutation.mutate(folder.id),
          },
        });
      },
    });
  }

  return (
    <section aria-labelledby="folder-manager-title" className="space-y-3">
      <div className="rounded-xl bg-muted/40 p-4">
        <h2 id="folder-manager-title" className="font-semibold">
          Organizar pastas
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize tarefas e notas.
        </p>
      </div>

      {editingFolder ? (
        <FolderEditor
          folder={editingFolder}
          folders={folders}
          isSaving={updateMutation.isPending}
          onSave={saveEditing}
          onCancel={cancelEditing}
        />
      ) : null}

      <form
        onSubmit={create}
        className="space-y-4 rounded-xl border border-border/70 p-4"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Nome</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Trabalho, Estudos ou Pessoal"
            aria-label="Nome da nova pasta"
            autoFocus={autoFocusNew && !editingFolder}
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Cor da pasta</legend>
          <div className="flex flex-wrap gap-2">
            {ORGANIZER_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setColor(option.value)}
                className={
                  "grid size-9 place-items-center rounded-lg border transition-transform hover:scale-105 " +
                  (color === option.value
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border")
                }
                aria-label={option.name}
                aria-pressed={color === option.value}
              >
                <FolderIcon
                  className="size-5"
                  style={{ color: option.value }}
                />
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Local</span>
          <select
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            className="min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Nível principal</option>
            {folders
              .filter((f) => f.parent_id === null)
              .map((folder) => (
                <option key={folder.id} value={folder.id}>
                  Dentro de {folder.name}
                </option>
              ))}
          </select>
        </label>

        <Button
          type="submit"
          loading={createMutation.isPending}
          disabled={!name.trim()}
          className="w-full sm:w-auto"
        >
          <Plus className="size-4" aria-hidden="true" />
          Criar pasta
        </Button>
      </form>

      {foldersQuery.isLoading ? (
        <p className="py-4 text-sm text-muted-foreground">
          Carregando pastas...
        </p>
      ) : foldersQuery.isError ? (
        <div className="flex items-center justify-between gap-3 py-3 text-sm text-destructive">
          <span>Não foi possível carregar as pastas.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => foldersQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : folders.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Nenhuma pasta criada.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {folders.map((folder, index) => (
            <li
              key={folder.id}
              className="flex min-w-0 items-center gap-1 px-2 py-1.5"
            >
              <FolderIcon
                className="size-4 shrink-0 text-muted-foreground"
                style={{ color: folder.color ?? undefined }}
                aria-hidden="true"
              />
              <Link
                href={"/app/folders/" + folder.id}
                className="min-w-0 flex-1 truncate rounded-sm px-1 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {folder.name}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-9"
                onClick={() => move(index, -1)}
                disabled={index === 0 || reorderMutation.isPending}
                aria-label={"Mover " + folder.name + " para cima"}
              >
                <ArrowUp className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-9"
                onClick={() => move(index, 1)}
                disabled={
                  index === folders.length - 1 || reorderMutation.isPending
                }
                aria-label={"Mover " + folder.name + " para baixo"}
              >
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-9"
                onClick={() => beginEditing(folder)}
                aria-label={"Editar " + folder.name}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 min-h-9 text-muted-foreground hover:text-destructive"
                onClick={() => remove(folder)}
                disabled={deleteMutation.isPending}
                aria-label={"Excluir " + folder.name}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
