import type { JSONContent } from "@tiptap/core";

export interface FolderSummary {
  id: string;
  name: string;
}

export interface CategorySummary {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: JSONContent;
  plain_text: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  folder?: FolderSummary | null;
  categories?: CategorySummary[];
}

export type TaskStatus = "todo" | "in_progress" | "completed";

export interface Board {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BoardColumn {
  id: string;
  user_id: string;
  board_id: string;
  name: string;
  position: number;
  semantic_status: TaskStatus | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LinkedTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  completed_at: string | null;
}

export interface BoardCard {
  id: string;
  user_id: string;
  board_id: string;
  column_id: string;
  task_id: string | null;
  title: string | null;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  task?: LinkedTaskSummary | null;
}

export interface BoardWithContent extends Board {
  columns: Array<BoardColumn & { cards: BoardCard[] }>;
}

export type SearchEntity = "task" | "note" | "folder" | "card";

export interface GlobalSearchResult {
  entity_type: SearchEntity;
  id: string;
  title: string;
  excerpt: string | null;
  updated_at: string;
  parent_id: string | null;
}

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type ThemePreference = "purple" | "black" | "white";

export interface UserPreferences {
  user_id: string;
  theme: ThemePreference;
  week_starts_on: 0 | 1;
  default_task_view: "all" | "today" | "upcoming";
  created_at: string;
  updated_at: string;
}
