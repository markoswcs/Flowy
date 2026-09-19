import { getAuthenticatedClient } from "@/services/authenticated-client";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/productivity";

const CATEGORY_FIELDS =
  "id,user_id,name,color,position,created_at,updated_at,deleted_at";

export async function listCategories(): Promise<Category[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function getCategory(categoryId: string): Promise<Category> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("categories")
    .select(CATEGORY_FIELDS)
    .eq("id", categoryId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  return data as Category;
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category> {
  const { supabase, userId } = await getAuthenticatedClient();
  const name = input.name.trim();
  if (!name) throw new Error("Digite um nome para a categoria.");

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: userId,
      name,
      color: input.color ?? "#64748B",
      position: input.position ?? Date.now(),
    })
    .select(CATEGORY_FIELDS)
    .single();

  if (error) throw error;
  return data as Category;
}

export async function updateCategory(
  input: UpdateCategoryInput,
): Promise<Category> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { id, ...changes } = input;
  const values: Record<string, unknown> = {
    ...changes,
    updated_at: new Date().toISOString(),
  };

  if (typeof changes.name === "string") {
    values.name = changes.name.trim();
    if (!values.name) throw new Error("Digite um nome para a categoria.");
  }

  const { data, error } = await supabase
    .from("categories")
    .update(values)
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select(CATEGORY_FIELDS)
    .single();

  if (error) throw error;
  return data as Category;
}

export async function reorderCategories(
  categories: Array<Pick<Category, "id" | "position">>,
): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const updatedAt = new Date().toISOString();
  const results = await Promise.all(
    categories.map(({ id, position }) =>
      supabase
        .from("categories")
        .update({ position, updated_at: updatedAt })
        .eq("id", id)
        .eq("user_id", userId)
        .is("deleted_at", null),
    ),
  );
  const firstError = results.find(({ error }) => error)?.error;
  if (firstError) throw firstError;
}

export async function softDeleteCategory(categoryId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", categoryId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) throw error;
}

export async function restoreCategory(categoryId: string): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) throw error;
}

export async function permanentlyDeleteCategory(
  categoryId: string,
): Promise<void> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) throw error;
}
