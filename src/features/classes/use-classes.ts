"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/lib/toast";
import { getAuthenticatedClient, messageFromUnknownError } from "@/services/authenticated-client";

import type { ClassSlot, ClassSlotInput } from "./schedule";

const classKeys = { all: ["class-slots"] as const };

async function listClasses(): Promise<ClassSlot[]> {
  const { supabase, userId } = await getAuthenticatedClient();
  const { data, error } = await supabase
    .from("class_slots")
    .select("*")
    .eq("user_id", userId)
    .order("weekday")
    .order("starts_at");
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
      const values = { ...input, name: input.name.trim(), room: input.room?.trim() || null };
      const query = id
        ? supabase.from("class_slots").update(values).eq("id", id).eq("user_id", userId)
        : supabase.from("class_slots").insert({ ...values, user_id: userId });
      const { error } = await query;
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: classKeys.all }),
    onError: (error) => toast.error("Não foi possível salvar a aula.", { description: messageFromUnknownError(error) }),
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { supabase, userId } = await getAuthenticatedClient();
      const { error } = await supabase.from("class_slots").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: classKeys.all }),
    onError: () => toast.error("Não foi possível apagar a aula."),
  });
}
