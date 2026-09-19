import {
  permanentlyDeleteCategory,
  restoreCategory,
} from "@/services/categories";
import { permanentlyDeleteFolder, restoreFolder } from "@/services/folders";
import { getAuthenticatedClient } from "@/services/authenticated-client";
import {
  permanentlyDeleteBoard,
  permanentlyDeleteCard,
  permanentlyDeleteColumn,
  updateBoard,
  updateCard,
  updateColumn,
} from "@/services/kanban";
import { permanentlyDeleteNote, restoreNote } from "@/services/notes";
import { permanentlyDeleteTask, restoreTask } from "@/services/tasks";
import type { TrashItem, TrashItemKind } from "@/types/productivity";

const RETENTION_IN_MS = 7 * 24 * 60 * 60 * 1_000;

interface DeletedTaskRow {
  id: string;
  title: string;
  description: string | null;
  deleted_at: string;
}

interface DeletedNamedRow {
  id: string;
  name: string;
  deleted_at: string;
}

interface DeletedCardRow {
  id: string;
  title: string | null;
  description: string | null;
  deleted_at: string;
  task: { title: string } | Array<{ title: string }> | null;
}

function relationTitle(relation: DeletedCardRow["task"]): string | null {
  if (Array.isArray(relation)) return relation[0]?.title ?? null;
  return relation?.title ?? null;
}

function removalDate(deletedAt: string): string {
  return new Date(
    new Date(deletedAt).getTime() + RETENTION_IN_MS,
  ).toISOString();
}

export async function listTrashItems(): Promise<TrashItem[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const [
    tasksResult,
    foldersResult,
    categoriesResult,
    notesResult,
    boardsResult,
    columnsResult,
    cardsResult,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,title,description,deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null),
    supabase
      .from("folders")
      .select("id,name,deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null),
    supabase
      .from("categories")
      .select("id,name,deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null),
    supabase
      .from("notes")
      .select("id,title,plain_text,deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null),
    supabase
      .from("boards")
      .select("id,name,deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null),
    supabase
      .from("board_columns")
      .select("id,name,deleted_at")
      .eq("user_id", userId)
      .not("deleted_at", "is", null),
    supabase
      .from("board_cards")
      .select("id,title,description,deleted_at,task:tasks(title)")
      .eq("user_id", userId)
      .not("deleted_at", "is", null),
  ]);

  const error =
    tasksResult.error ??
    foldersResult.error ??
    categoriesResult.error ??
    notesResult.error ??
    boardsResult.error ??
    columnsResult.error ??
    cardsResult.error;
  if (error) throw error;

  const tasks = (tasksResult.data ?? []) as unknown as DeletedTaskRow[];
  const folders = (foldersResult.data ?? []) as unknown as DeletedNamedRow[];
  const categories = (categoriesResult.data ??
    []) as unknown as DeletedNamedRow[];
  const notes = (notesResult.data ?? []) as unknown as Array<
    DeletedNamedRow & { title: string; plain_text: string }
  >;
  const boards = (boardsResult.data ?? []) as unknown as DeletedNamedRow[];
  const columns = (columnsResult.data ?? []) as unknown as DeletedNamedRow[];
  const cards = (cardsResult.data ?? []) as unknown as DeletedCardRow[];

  return [
    ...tasks.map<TrashItem>((task) => ({
      id: task.id,
      kind: "task",
      title: task.title,
      detail: task.description,
      deleted_at: task.deleted_at,
      permanently_deleted_at: removalDate(task.deleted_at),
    })),
    ...folders.map<TrashItem>((folder) => ({
      id: folder.id,
      kind: "folder",
      title: folder.name,
      detail: null,
      deleted_at: folder.deleted_at,
      permanently_deleted_at: removalDate(folder.deleted_at),
    })),
    ...categories.map<TrashItem>((category) => ({
      id: category.id,
      kind: "category",
      title: category.name,
      detail: null,
      deleted_at: category.deleted_at,
      permanently_deleted_at: removalDate(category.deleted_at),
    })),
    ...notes.map<TrashItem>((note) => ({
      id: note.id,
      kind: "note",
      title: note.title,
      detail: note.plain_text.slice(0, 160) || null,
      deleted_at: note.deleted_at,
      permanently_deleted_at: removalDate(note.deleted_at),
    })),
    ...boards.map<TrashItem>((board) => ({
      id: board.id,
      kind: "board",
      title: board.name,
      detail: null,
      deleted_at: board.deleted_at,
      permanently_deleted_at: removalDate(board.deleted_at),
    })),
    ...columns.map<TrashItem>((column) => ({
      id: column.id,
      kind: "column",
      title: column.name,
      detail: null,
      deleted_at: column.deleted_at,
      permanently_deleted_at: removalDate(column.deleted_at),
    })),
    ...cards.map<TrashItem>((card) => ({
      id: card.id,
      kind: "card",
      title: card.title || relationTitle(card.task) || "Card sem título",
      detail: card.description,
      deleted_at: card.deleted_at,
      permanently_deleted_at: removalDate(card.deleted_at),
    })),
  ].sort(
    (left, right) =>
      new Date(right.deleted_at).getTime() -
      new Date(left.deleted_at).getTime(),
  );
}

export async function restoreTrashItem(
  kind: TrashItemKind,
  id: string,
): Promise<void> {
  if (kind === "task") return restoreTask(id);
  if (kind === "folder") return restoreFolder(id);
  if (kind === "category") return restoreCategory(id);

  const { supabase } = await getAuthenticatedClient();
  if (kind === "note") return restoreNote(supabase, id);
  if (kind === "board") return updateBoard(supabase, id, { deleted_at: null });
  if (kind === "column")
    return updateColumn(supabase, id, { deleted_at: null });
  return updateCard(supabase, id, { deleted_at: null });
}

export async function permanentlyDeleteTrashItem(
  kind: TrashItemKind,
  id: string,
): Promise<void> {
  if (kind === "task") return permanentlyDeleteTask(id);
  if (kind === "folder") return permanentlyDeleteFolder(id);
  if (kind === "category") return permanentlyDeleteCategory(id);

  const { supabase } = await getAuthenticatedClient();
  if (kind === "note") return permanentlyDeleteNote(supabase, id);
  if (kind === "board") return permanentlyDeleteBoard(supabase, id);
  if (kind === "column") return permanentlyDeleteColumn(supabase, id);
  return permanentlyDeleteCard(supabase, id);
}
