import { getAuthenticatedClient } from "@/services/authenticated-client";
import type {
  Category,
  CreateTaskInput,
  Folder,
  Task,
  TaskFilters,
  UpdateTaskInput,
} from "@/types/productivity";

const TASK_FIELDS = `
  id,
  user_id,
  title,
  description,
  due_date,
  due_time,
  recurrence,
  priority,
  status,
  folder_id,
  position,
  completed_at,
  created_at,
  updated_at,
  deleted_at,
  folder:folders (
    id,
    user_id,
    name,
    position,
    created_at,
    updated_at,
    deleted_at
  ),
  task_categories (
    category:categories (
      id,
      user_id,
      name,
      color,
      position,
      created_at,
      updated_at,
      deleted_at
    )
  )
`;

const TASK_FIELDS_WITH_CATEGORY_FILTER = TASK_FIELDS.replace(
  "task_categories (",
  "task_categories!inner (",
);

interface TaskJoinRow extends Omit<Task, "folder" | "categories"> {
  folder: Folder | Folder[] | null;
  task_categories: Array<{ category: Category | Category[] | null }> | null;
}

function singleRelation<T>(relation: T | T[] | null): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

function normalizeTask(row: TaskJoinRow): Task {
  const folder = singleRelation(row.folder);
  const categories = (row.task_categories ?? [])
    .map(({ category }) => singleRelation(category))
    .filter((category): category is Category =>
      Boolean(category && !category.deleted_at),
    );

  return {
    ...row,
    folder: folder && !folder.deleted_at ? folder : null,
    categories,
  };
}

function localDateValue(value = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeSearchTerm(value: string): string {
  return value
    .replace(/[%(),]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function listTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const categoryId =
    filters.categoryId && filters.categoryId !== "all"
      ? filters.categoryId
      : null;
  let query = supabase
    .from("tasks")
    .select(categoryId ? TASK_FIELDS_WITH_CATEGORY_FILTER : TASK_FIELDS)
    .eq("user_id", userId)
    .is("deleted_at", null);

  const today = localDateValue();

  switch (filters.scope) {
    case "today":
      query = query.eq("due_date", today).neq("status", "completed");
      break;
    case "overdue":
      query = query.lt("due_date", today).neq("status", "completed");
      break;
    case "upcoming":
      query = query.gt("due_date", today).neq("status", "completed");
      break;
    case "completed":
      query = query.eq("status", "completed");
      break;
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters.folderId && filters.folderId !== "all") {
    query = query.eq("folder_id", filters.folderId);
  }
  if (categoryId) {
    query = query.eq("task_categories.category_id", categoryId);
  }

  const search = safeSearchTerm(filters.search ?? "");
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error } = await query
    .order("position", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) throw error;
  return ((data ?? []) as unknown as TaskJoinRow[]).map(normalizeTask);
}

export async function getTask(taskId: string): Promise<Task> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_FIELDS)
    .eq("id", taskId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  return normalizeTask(data as unknown as TaskJoinRow);
}

async function replaceTaskCategories(
  taskId: string,
  categoryIds: string[],
  userId: string,
): Promise<void> {
  const { supabase } = await getAuthenticatedClient();
  const { error: deleteError } = await supabase
    .from("task_categories")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId);

  if (deleteError) throw deleteError;
  if (categoryIds.length === 0) return;

  const uniqueCategoryIds = [...new Set(categoryIds)];
  const { error: insertError } = await supabase.from("task_categories").insert(
    uniqueCategoryIds.map((categoryId) => ({
      task_id: taskId,
      category_id: categoryId,
      user_id: userId,
    })),
  );

  if (insertError) throw insertError;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { supabase, userId } = await getAuthenticatedClient();
  const title = input.title.trim();
  if (!title) throw new Error("Digite um título para a tarefa.");

  const { category_ids: categoryIds = [], ...values } = input;
  const now = new Date().toISOString();
  const status = values.status ?? "todo";
  if (values.recurrence && !values.due_date) {
    throw new Error("Escolha uma data para repetir a tarefa.");
  }
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...values,
      title,
      user_id: userId,
      description: values.description?.trim() || null,
      due_date: values.due_date || null,
      due_time: values.due_date && values.due_time ? values.due_time : null,
      recurrence: values.recurrence ?? null,
      priority: values.priority ?? "normal",
      status,
      folder_id: values.folder_id || null,
      position: values.position ?? Date.now(),
      completed_at: status === "completed" ? now : null,
    })
    .select("id")
    .single();

  if (error) throw error;
  const taskId = (data as unknown as { id: string }).id;
  if (categoryIds.length) {
    await replaceTaskCategories(taskId, categoryIds, userId);
  }
  return getTask(taskId);
}

export async function updateTask(input: UpdateTaskInput): Promise<Task> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { id, category_ids: categoryIds, ...changes } = input;
  const values: Record<string, unknown> = {
    ...changes,
    updated_at: new Date().toISOString(),
  };

  if (typeof changes.title === "string") {
    values.title = changes.title.trim();
    if (!values.title) throw new Error("Digite um título para a tarefa.");
  }
  if (typeof changes.description === "string") {
    values.description = changes.description.trim() || null;
  }
  if (changes.due_date === null) {
    if (changes.recurrence) {
      throw new Error("Escolha uma data para repetir a tarefa.");
    }
    values.due_time = null;
    values.recurrence = null;
  }
  if (changes.status === "completed" && changes.completed_at === undefined) {
    values.completed_at = new Date().toISOString();
  }
  if (changes.status && changes.status !== "completed") {
    values.completed_at = null;
  }

  const { error } = await supabase
    .from("tasks")
    .update(values)
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw error;
  if (categoryIds) await replaceTaskCategories(id, categoryIds, userId);
  return getTask(id);
}

export async function softDeleteTask(taskId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", taskId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw error;
}

export async function restoreTask(taskId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) throw error;
}

export async function permanentlyDeleteTask(taskId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) throw error;
}
