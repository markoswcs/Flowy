"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { categoryKeys } from "@/features/categories/use-categories";
import { folderKeys } from "@/features/folders/use-folders";
import { boardKeys } from "@/features/kanban/use-kanban";
import { noteKeys } from "@/features/notes/use-notes";
import { taskKeys } from "@/features/tasks/query-keys";
import { messageFromUnknownError } from "@/services/authenticated-client";
import {
  listTrashItems,
  permanentlyDeleteTrashItem,
  restoreTrashItem,
} from "@/services/trash";
import type { TrashItem } from "@/types/productivity";

export const trashKeys = {
  all: ["trash"] as const,
  list: () => [...trashKeys.all, "list"] as const,
};

interface TrashMutationContext {
  previous: TrashItem[] | undefined;
}

function invalidateProductivity(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: trashKeys.all });
  void queryClient.invalidateQueries({ queryKey: taskKeys.all });
  void queryClient.invalidateQueries({ queryKey: folderKeys.all });
  void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
  void queryClient.invalidateQueries({ queryKey: noteKeys.all });
  void queryClient.invalidateQueries({ queryKey: boardKeys.all });
}

export function useTrashItems() {
  return useQuery({
    queryKey: trashKeys.list(),
    queryFn: listTrashItems,
    staleTime: 10_000,
  });
}

export function useRestoreTrashItem() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, TrashItem, TrashMutationContext>({
    mutationFn: (item) => restoreTrashItem(item.kind, item.id),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.all });
      const previous = queryClient.getQueryData<TrashItem[]>(trashKeys.list());
      queryClient.setQueryData<TrashItem[]>(trashKeys.list(), (items = []) =>
        items.filter(
          (candidate) =>
            candidate.id !== item.id || candidate.kind !== item.kind,
        ),
      );
      return { previous };
    },
    onError: (error, _item, context) => {
      queryClient.setQueryData(trashKeys.list(), context?.previous);
      toast.error("Não foi possível restaurar o item.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: () => toast.success("Item restaurado."),
    onSettled: () => invalidateProductivity(queryClient),
  });
}

export function usePermanentlyDeleteTrashItem() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, TrashItem, TrashMutationContext>({
    mutationFn: (item) => permanentlyDeleteTrashItem(item.kind, item.id),
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey: trashKeys.all });
      const previous = queryClient.getQueryData<TrashItem[]>(trashKeys.list());
      queryClient.setQueryData<TrashItem[]>(trashKeys.list(), (items = []) =>
        items.filter(
          (candidate) =>
            candidate.id !== item.id || candidate.kind !== item.kind,
        ),
      );
      return { previous };
    },
    onError: (error, _item, context) => {
      queryClient.setQueryData(trashKeys.list(), context?.previous);
      toast.error("Não foi possível excluir o item permanentemente.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: () => toast.success("Item excluído permanentemente."),
    onSettled: () => invalidateProductivity(queryClient),
  });
}
