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
  createFolder,
  getFolder,
  listFolders,
  reorderFolders,
  restoreFolder,
  softDeleteFolder,
  updateFolder,
} from "@/services/folders";
import type {
  CreateFolderInput,
  Folder,
  UpdateFolderInput,
} from "@/types/productivity";

export const folderKeys = {
  all: ["folders"] as const,
  list: () => [...folderKeys.all, "list"] as const,
  detail: (id: string) => [...folderKeys.all, "detail", id] as const,
};

type FolderSnapshot = Array<[QueryKey, Folder[] | undefined]>;

interface FolderMutationContext {
  snapshots: FolderSnapshot;
  optimisticId?: string;
}

function snapshotFolders(
  queryClient: ReturnType<typeof useQueryClient>,
): FolderSnapshot {
  return queryClient.getQueriesData<Folder[]>({ queryKey: folderKeys.list() });
}

function restoreFolders(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: FolderSnapshot,
) {
  snapshots.forEach(([key, value]) => queryClient.setQueryData(key, value));
}

export function useFolders() {
  return useQuery({
    queryKey: folderKeys.list(),
    queryFn: listFolders,
    staleTime: 30_000,
  });
}

export function useFolder(folderId: string) {
  return useQuery({
    queryKey: folderKeys.detail(folderId),
    queryFn: () => getFolder(folderId),
    enabled: Boolean(folderId),
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation<Folder, unknown, CreateFolderInput, FolderMutationContext>(
    {
      mutationFn: createFolder,
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: folderKeys.all });
        const snapshots = snapshotFolders(queryClient);
        const now = new Date().toISOString();
        const optimisticId = `optimistic-${crypto.randomUUID()}`;
        const optimisticFolder: Folder = {
          id: optimisticId,
          user_id: "",
          name: input.name.trim(),
          position: input.position ?? Date.now(),
          created_at: now,
          updated_at: now,
          deleted_at: null,
          color: input.color ?? null,
          icon: input.icon ?? null,
          parent_id: input.parent_id ?? null,
        };
        queryClient.setQueryData<Folder[]>(
          folderKeys.list(),
          (folders = []) => [...folders, optimisticFolder],
        );
        return { snapshots, optimisticId };
      },
      onError: (error, _input, context) => {
        if (context) restoreFolders(queryClient, context.snapshots);
        toast.error("Não foi possível criar a pasta.", {
          description: messageFromUnknownError(error),
        });
      },
      onSuccess: (folder, _input, context) => {
        queryClient.setQueryData<Folder[]>(folderKeys.list(), (folders = []) =>
          folders.map((item) =>
            item.id === context?.optimisticId ? folder : item,
          ),
        );
      },
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: folderKeys.all }),
    },
  );
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation<Folder, unknown, UpdateFolderInput, FolderMutationContext>(
    {
      mutationFn: updateFolder,
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: folderKeys.all });
        const snapshots = snapshotFolders(queryClient);
        queryClient.setQueryData<Folder[]>(folderKeys.list(), (folders = []) =>
          folders.map((folder) =>
            folder.id === input.id
              ? { ...folder, ...input, updated_at: new Date().toISOString() }
              : folder,
          ),
        );
        return { snapshots };
      },
      onError: (error, _input, context) => {
        if (context) restoreFolders(queryClient, context.snapshots);
        toast.error("Não foi possível salvar a pasta.", {
          description: messageFromUnknownError(error),
        });
      },
      onSuccess: (folder) => {
        queryClient.setQueryData<Folder[]>(folderKeys.list(), (folders = []) =>
          folders.map((item) => (item.id === folder.id ? folder : item)),
        );
        queryClient.setQueryData(folderKeys.detail(folder.id), folder);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: folderKeys.all });
        void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      },
    },
  );
}

export function useReorderFolders() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, Folder[], FolderMutationContext>({
    mutationFn: (folders) => reorderFolders(folders),
    onMutate: async (folders) => {
      await queryClient.cancelQueries({ queryKey: folderKeys.all });
      const snapshots = snapshotFolders(queryClient);
      queryClient.setQueryData(folderKeys.list(), folders);
      return { snapshots };
    },
    onError: (error, _folders, context) => {
      if (context) restoreFolders(queryClient, context.snapshots);
      toast.error("Não foi possível reordenar as pastas.", {
        description: messageFromUnknownError(error),
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: folderKeys.all }),
  });
}

export function useSoftDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string, FolderMutationContext>({
    mutationFn: softDeleteFolder,
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: folderKeys.all });
      const snapshots = snapshotFolders(queryClient);
      queryClient.setQueryData<Folder[]>(folderKeys.list(), (folders = []) =>
        folders.filter((folder) => folder.id !== folderId),
      );
      return { snapshots };
    },
    onError: (error, _folderId, context) => {
      if (context) restoreFolders(queryClient, context.snapshots);
      toast.error("Não foi possível mover a pasta para a lixeira.", {
        description: messageFromUnknownError(error),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: folderKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useRestoreFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreFolder,
    onError: (error) => {
      toast.error("Não foi possível desfazer a exclusão da pasta.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: () => toast.success("Pasta restaurada."),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: folderKeys.all });
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}
