"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Link2Off, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { notify } from "@/providers/notification-provider";
import { getAuthenticatedClient } from "@/services/authenticated-client";

const shareKey = (folderId: string) => ["shared-list", folderId] as const;

async function readToken(folderId: string): Promise<string | null> {
  const { supabase } = await getAuthenticatedClient();
  const { data, error } = await supabase.from("shared_lists").select("token").eq("folder_id", folderId).maybeSingle();
  if (error) return null;
  return (data as { token: string } | null)?.token ?? null;
}

export function sharedListUrl(token: string) {
  return `${window.location.origin}/lista/${token}`;
}

async function hand(url: string, title: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text: `Lista "${title}" no Flowy`, url });
      return;
    } catch {
      // Cancelled: fall back to copying.
    }
  }
  await navigator.clipboard?.writeText(url);
  notify("Link copiado");
}

/**
 * Shares a folder as a read-only public list: whoever opens the link sees the
 * open tasks (titles only) and can copy them into their own Flowy.
 */
export function ShareListButton({ folderId, folderName }: { folderId: string; folderName: string }) {
  const queryClient = useQueryClient();
  const token = useQuery({ queryKey: shareKey(folderId), queryFn: () => readToken(folderId) });

  const share = useMutation({
    mutationFn: async () => {
      if (token.data) return token.data;
      const { supabase, userId } = await getAuthenticatedClient();
      const { data, error } = await supabase
        .from("shared_lists")
        .insert({ folder_id: folderId, user_id: userId })
        .select("token")
        .single();
      if (error) throw error;
      return (data as { token: string }).token;
    },
    onSuccess: async (value) => {
      queryClient.setQueryData(shareKey(folderId), value);
      await hand(sharedListUrl(value), folderName);
    },
    onError: () => toast.error("Não foi possível criar o link."),
  });

  const stop = useMutation({
    mutationFn: async () => {
      const { supabase } = await getAuthenticatedClient();
      const { error } = await supabase.from("shared_lists").delete().eq("folder_id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(shareKey(folderId), null);
      notify("Link desativado: quem tinha não vê mais a lista");
    },
    onError: () => toast.error("Não foi possível desativar o link."),
  });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => share.mutate()} loading={share.isPending}>
        {token.data ? <Link2 className="size-4" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
        {token.data ? "Copiar link" : "Compartilhar lista"}
      </Button>
      {token.data ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Parar de compartilhar"
          title="Parar de compartilhar"
          onClick={() => stop.mutate()}
          loading={stop.isPending}
          className="text-muted-foreground"
        >
          <Link2Off className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </>
  );
}
