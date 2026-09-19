export const TASK_PRIORITIES = ["low", "normal", "high"] as const;
export const TASK_STATUSES = ["todo", "in_progress", "completed"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  color: string | null;
  icon: string | null;
  parent_id: string | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  folder_id: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  folder: Folder | null;
  categories: Category[];
}

export type TaskScope = "all" | "today" | "overdue" | "upcoming" | "completed";

export interface TaskFilters {
  scope?: TaskScope;
  priority?: TaskPriority | "all";
  status?: TaskStatus | "all";
  folderId?: string | "all";
  categoryId?: string | "all";
  search?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  folder_id?: string | null;
  position?: number;
  category_ids?: string[];
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  folder_id?: string | null;
  position?: number;
  completed_at?: string | null;
  category_ids?: string[];
}

export interface CreateFolderInput {
  name: string;
  position?: number;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
}

export interface UpdateFolderInput {
  id: string;
  name?: string;
  position?: number;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  position?: number;
}

export interface UpdateCategoryInput {
  id: string;
  name?: string;
  color?: string;
  position?: number;
}

export type TrashItemKind =
  "task" | "folder" | "category" | "note" | "board" | "column" | "card";

export interface TrashItem {
  id: string;
  kind: TrashItemKind;
  title: string;
  detail: string | null;
  deleted_at: string;
  permanently_deleted_at: string;
}

export interface MutationSnapshot<T> {
  queryKey: readonly unknown[];
  value: T | undefined;
}
