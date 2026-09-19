"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { createClient } from "@/lib/supabase/client";

const tableQueryKeys: Record<string, string[][]> = {
  tasks: [["tasks"], ["trash"], ["dashboard"]],
  task_categories: [["tasks"]],
  folders: [["folders"], ["trash"]],
  categories: [["categories"]],
  notes: [["notes"], ["trash"]],
  note_categories: [["notes"]],
  boards: [["boards"], ["trash"]],
  board_columns: [["boards"]],
  board_cards: [["boards"], ["trash"]],
};

export function RealtimeSync() {
  const client = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof client.channel> | null = null;

    client.auth
      .getUser()
      .then(({ data }: { data: { user: { id: string } | null } }) => {
        const user = data.user;
        if (cancelled || !user) return;
        channel = client.channel(`flowy-sync:${user.id}`);
        Object.entries(tableQueryKeys).forEach(([table, keys]) => {
          channel =
            channel?.on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table,
                filter: `user_id=eq.${user.id}`,
              },
              () =>
                keys.forEach((queryKey) =>
                  queryClient.invalidateQueries({ queryKey }),
                ),
            ) ?? null;
        });
        channel?.subscribe();
      });

    return () => {
      cancelled = true;
      if (channel) client.removeChannel(channel);
    };
  }, [client, queryClient]);

  return null;
}
