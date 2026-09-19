"use client";

import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { taskKeys } from "@/features/tasks/query-keys";
import { messageFromUnknownError } from "@/services/authenticated-client";
import {
  createCategory,
  getCategory,
  listCategories,
  reorderCategories,
  restoreCategory,
  softDeleteCategory,
  updateCategory,
} from "@/services/categories";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/productivity";

export const categoryKeys = {
  all: ["categories"] as const,
  list: () => [...categoryKeys.all, "list"] as const,
};

type CategorySnapshot = Array<[QueryKey, Category[] | undefined]>;

interface CategoryMutationContext {
  snapshots: CategorySnapshot;
  optimisticId?: string;
}

function snapshots(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.getQueriesData<Category[]>({
    queryKey: categoryKeys.list(),
  });
}

function restore(
  queryClient: ReturnType<typeof useQueryClient>,
  values: CategorySnapshot,
) {
  values.forEach(([key, value]) => queryClient.setQueryData(key, value));
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: listCategories,
    staleTime: 30_000,
  });
}

export function useCategory(categoryId: string) {
  return useQuery({
    queryKey: [...categoryKeys.all, "detail", categoryId],
    queryFn: () => getCategory(categoryId),
    enabled: Boolean(categoryId),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation<
    Category,
    unknown,
    CreateCategoryInput,
    CategoryMutationContext
  >({
    mutationFn: createCategory,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      const previous = snapshots(queryClient);
      const now = new Date().toISOString();
      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const category: Category = {
        id: optimisticId,
        user_id: "",
        name: input.name.trim(),
        color: input.color ?? "#64748B",
        position: input.position ?? Date.now(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      queryClient.setQueryData<Category[]>(
        categoryKeys.list(),
        (categories = []) => [...categories, category],
      );
      return { snapshots: previous, optimisticId };
    },
    onError: (error, _input, context) => {
      if (context) restore(queryClient, context.snapshots);
      toast.error("Não foi possível criar a tag.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: (category, _input, context) => {
      queryClient.setQueryData<Category[]>(
        categoryKeys.list(),
        (categories = []) =>
          categories.map((item) =>
            item.id === context?.optimisticId ? category : item,
          ),
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation<
    Category,
    unknown,
    UpdateCategoryInput,
    CategoryMutationContext
  >({
    mutationFn: updateCategory,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      const previous = snapshots(queryClient);
      queryClient.setQueryData<Category[]>(
        categoryKeys.list(),
        (categories = []) =>
          categories.map((category) =>
            category.id === input.id
              ? { ...category, ...input, updated_at: new Date().toISOString() }
              : category,
          ),
      );
      return { snapshots: previous };
    },
    onError: (error, _input, context) => {
      if (context) restore(queryClient, context.snapshots);
      toast.error("Não foi possível salvar a tag.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(
        categoryKeys.list(),
        (categories = []) =>
          categories.map((item) => (item.id === category.id ? category : item)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, Category[], CategoryMutationContext>({
    mutationFn: (categories) => reorderCategories(categories),
    onMutate: async (categories) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      const previous = snapshots(queryClient);
      queryClient.setQueryData(categoryKeys.list(), categories);
      return { snapshots: previous };
    },
    onError: (error, _categories, context) => {
      if (context) restore(queryClient, context.snapshots);
      toast.error("Não foi possível reordenar as tags.", {
        description: messageFromUnknownError(error),
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useSoftDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string, CategoryMutationContext>({
    mutationFn: softDeleteCategory,
    onMutate: async (categoryId) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.all });
      const previous = snapshots(queryClient);
      queryClient.setQueryData<Category[]>(
        categoryKeys.list(),
        (categories = []) =>
          categories.filter((category) => category.id !== categoryId),
      );
      return { snapshots: previous };
    },
    onError: (error, _categoryId, context) => {
      if (context) restore(queryClient, context.snapshots);
      toast.error("Não foi possível mover a tag para a lixeira.", {
        description: messageFromUnknownError(error),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useRestoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreCategory,
    onError: (error) => {
      toast.error("Não foi possível desfazer a exclusão da tag.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: () => toast.success("Tag restaurada."),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}
