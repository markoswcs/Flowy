"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/lib/toast";
import {
  getAuthenticatedClient,
  messageFromUnknownError,
} from "@/services/authenticated-client";

import type { ClassSlot, ClassSlotInput } from "./schedule";

const classKeys = { all: ["class-slots"] as const };

async function listClasses(): Promise<ClassSlot[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const query = (onlyKept: boolean) => {
    const base = supabase.from("class_slots").select("*").eq("user_id", userId);
    return (onlyKept ? base.is("deleted_at", null) : base)
      .order("weekday")
      .order("starts_at");
  };
  let { data, error } = await query(true);
  // Before the routine-trash migration there is no deleted_at column.
  if (error && /deleted_at/i.test(error.message))
    ({ data, error } = await query(false));
  if (error) throw error;
  return (data ?? []) as ClassSlot[];
}

/** The weekly class schedule; empty (not an error) before the migration exists. */
export function useClasses() {
  return useQuery({
    queryKey: classKeys.all,
    queryFn: () => listClasses().catch(() => [] as ClassSlot[]),
    staleTime: 5 * 60_000,
  });
}

export function useSaveClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ClassSlotInput & { id?: string }) => {
      const { supabase, userId } = await getAuthenticatedClient();
      const { kind, ...rest } = input;
      const base = {
        ...rest,
        name: input.name.trim(),
        room: input.room?.trim() || null,
      };
      const send = (values: Record<string, unknown>) =>
        id
          ? supabase
              .from("class_slots")
              .update(values)
              .eq("id", id)
              .eq("user_id", userId)
          : supabase.from("class_slots").insert({ ...values, user_id: userId });
      let { error } = await send(kind ? { ...base, kind } : base);
      // Before the routine migration there is no "kind" column: save without it.
      if (error && kind && /kind/i.test(error.message))
        ({ error } = await send(base));
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: classKeys.all }),
    onError: (error) =>
      toast.error("Não foi possível salvar.", {
        description: messageFromUnknownError(error),
      }),
  });
}

/**
 * Moves an item to the trash (restorable for 7 days). Returns whether it went
 * to the trash; before the routine-trash migration it is deleted for good.
 */
export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<boolean> => {
      const { supabase, userId } = await getAuthenticatedClient();
      const { error } = await supabase
        .from("class_slots")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);
      if (!error) return true;
      if (!/deleted_at/i.test(error.message)) throw error;
      const removed = await supabase
        .from("class_slots")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (removed.error) throw removed.error;
      return false;
    },
    // Gone from the screen at once.
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<ClassSlot[]>(classKeys.all);
      queryClient.setQueryData<ClassSlot[]>(classKeys.all, (list) =>
        list?.filter((slot) => slot.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(classKeys.all, context?.previous);
      toast.error("Não foi possível excluir.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: classKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}

/** Brings an item back from the trash (the "Desfazer" of a deletion). */
export function useRestoreClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { supabase, userId } = await getAuthenticatedClient();
      const { error } = await supabase
        .from("class_slots")
        .update({ deleted_at: null })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: classKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
    onError: () => toast.error("Não foi possível restaurar."),
  });
}
