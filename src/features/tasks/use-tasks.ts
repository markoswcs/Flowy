"use client";

import { useEffect } from "react";
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { messageFromUnknownError } from "@/services/authenticated-client";
import {
  createTask,
  getTask,
  listTasks,
  restoreTask,
  softDeleteTask,
  updateTask,
} from "@/services/tasks";
import type {
  CreateTaskInput,
  Task,
  TaskFilters,
  UpdateTaskInput,
} from "@/types/productivity";

import { taskKeys } from "./query-keys";

type TaskSnapshot = Array<[QueryKey, Task[] | undefined]>;

interface TaskMutationContext {
  snapshots: TaskSnapshot;
  optimisticId?: string;
}

function restoreSnapshots(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: TaskSnapshot,
) {
  snapshots.forEach(([key, value]) => queryClient.setQueryData(key, value));
}

function updateTaskInLists(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (tasks: Task[]) => Task[],
) {
  queryClient.setQueriesData<Task[]>({ queryKey: taskKeys.lists() }, (tasks) =>
    tasks ? updater(tasks) : tasks,
  );
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => listTasks(filters),
    staleTime: 20_000,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => getTask(taskId),
    enabled: Boolean(taskId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, unknown, CreateTaskInput, TaskMutationContext>({
    mutationFn: createTask,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });
      const snapshots = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.lists(),
      });
      const now = new Date().toISOString();
      const optimisticId = `optimistic-${crypto.randomUUID()}`;
      const optimisticTask: Task = {
        id: optimisticId,
        user_id: "",
        title: input.title.trim(),
        description: input.description?.trim() || null,
        due_date: input.due_date || null,
        due_time: input.due_date && input.due_time ? input.due_time : null,
        priority: input.priority ?? "normal",
        status: input.status ?? "todo",
        folder_id: input.folder_id || null,
        position: input.position ?? Date.now(),
        completed_at: input.status === "completed" ? now : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        folder: null,
        categories: [],
      };

      updateTaskInLists(queryClient, (tasks) => [optimisticTask, ...tasks]);
      return { snapshots, optimisticId };
    },
    onError: (error, _input, context) => {
      if (context) restoreSnapshots(queryClient, context.snapshots);
      toast.error("Não foi possível criar a tarefa.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: (task, _input, context) => {
      updateTaskInLists(queryClient, (tasks) =>
        tasks.map((item) => (item.id === context?.optimisticId ? task : item)),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, unknown, UpdateTaskInput, TaskMutationContext>({
    mutationFn: updateTask,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const snapshots = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.lists(),
      });
      const now = new Date().toISOString();

      updateTaskInLists(queryClient, (tasks) =>
        tasks.map((task) => {
          if (task.id !== input.id) return task;
          const nextStatus = input.status ?? task.status;
          return {
            ...task,
            ...input,
            folder:
              input.folder_id !== undefined &&
              input.folder_id !== task.folder_id
                ? null
                : task.folder,
            completed_at:
              input.completed_at !== undefined
                ? input.completed_at
                : input.status === "completed"
                  ? now
                  : input.status
                    ? null
                    : task.completed_at,
            status: nextStatus,
            updated_at: now,
          };
        }),
      );
      return { snapshots };
    },
    onError: (error, _input, context) => {
      if (context) restoreSnapshots(queryClient, context.snapshots);
      toast.error("Não foi possível salvar a tarefa.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: (task) => {
      updateTaskInLists(queryClient, (tasks) =>
        tasks.map((item) => (item.id === task.id ? task : item)),
      );
      queryClient.setQueryData(taskKeys.detail(task.id), task);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useSoftDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string, TaskMutationContext>({
    mutationFn: softDeleteTask,
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const snapshots = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.lists(),
      });
      updateTaskInLists(queryClient, (tasks) =>
        tasks.filter((task) => task.id !== taskId),
      );
      return { snapshots };
    },
    onError: (error, _taskId, context) => {
      if (context) restoreSnapshots(queryClient, context.snapshots);
      toast.error("Não foi possível mover a tarefa para a lixeira.", {
        description: messageFromUnknownError(error),
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreTask,
    onError: (error) => {
      toast.error("Não foi possível desfazer a exclusão.", {
        description: messageFromUnknownError(error),
      });
    },
    onSuccess: () => toast.success("Tarefa restaurada."),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: taskKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

export function useTasksRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth
      .getUser()
      .then(({ data }: { data: { user: { id: string } | null } }) => {
        if (!active || !data.user) return;
        channel = supabase
          .channel(`tasks:${data.user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "tasks",
              filter: `user_id=eq.${data.user.id}`,
            },
            () => {
              void queryClient.invalidateQueries({ queryKey: taskKeys.all });
              void queryClient.invalidateQueries({ queryKey: ["trash"] });
            },
          )
          .subscribe();
      });

    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
