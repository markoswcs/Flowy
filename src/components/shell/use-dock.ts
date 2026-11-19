"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";

import { DEFAULT_DOCK, resolveDock } from "./dock-items";

const dockKey = ["dock"] as const;

/** The bottom-bar choice, kept in the account so it follows the person to any device. */
async function readDock(): Promise<string[]> {
  // From the server, not the local session: a choice made on another device shows here too.
  const { data } = await createClient().auth.getUser();
  return resolveDock(data.user?.user_metadata?.dock).map((item) => item.key);
}

export function useDock() {
  return useQuery({ queryKey: dockKey, queryFn: readDock, staleTime: Infinity, placeholderData: DEFAULT_DOCK });
}

export function useSaveDock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (keys: string[]) => {
      const { error } = await createClient().auth.updateUser({ data: { dock: keys } });
      if (error) throw error;
      return keys;
    },
    // The bar changes at once; a failed save puts the old one back.
    onMutate: async (keys) => {
      const previous = queryClient.getQueryData<string[]>(dockKey);
      queryClient.setQueryData(dockKey, keys);
      return { previous };
    },
    onError: (_error, _keys, context) => {
      if (context?.previous) queryClient.setQueryData(dockKey, context.previous);
    },
  });
}
