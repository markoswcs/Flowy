"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { getAuthenticatedClient } from "@/services/authenticated-client";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

const SEEN_KEY = "flowy:announcement-seen";
const SHOW_DAYS = 14;
const seenListeners = new Set<() => void>();

function readSeen() {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function markSeen(id: string) {
  try {
    window.localStorage.setItem(SEEN_KEY, id);
  } catch {
    // Private mode: it shows again after a reload.
  }
  seenListeners.forEach((listener) => listener());
}

async function latestAnnouncement(): Promise<Announcement | null> {
  const { supabase } = await getAuthenticatedClient();
  const since = new Date(Date.now() - SHOW_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // Before the migration runs the table is missing: no card, no error.
  if (error) return null;
  return data as Announcement | null;
}

/** The latest announcement from Flowy, until the person closes it. */
export function AnnouncementCard() {
  const latest = useQuery({ queryKey: ["announcement"], queryFn: latestAnnouncement, staleTime: 10 * 60_000 });
  const seen = useSyncExternalStore(
    (listener) => {
      seenListeners.add(listener);
      return () => seenListeners.delete(listener);
    },
    readSeen,
    () => null,
  );
  const item = latest.data;
  if (!item || item.id === seen) return null;

  return (
    <section className="relative flex gap-3 rounded-2xl border border-primary/30 bg-primary/[0.07] p-3.5 pr-10 animate-in fade-in slide-in-from-top-2" aria-label="Aviso do Flowy">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl flowy-active">
        <Megaphone className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{item.title}</p>
        <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{item.body}</p>
      </div>
      <button
        type="button"
        onClick={() => markSeen(item.id)}
        aria-label="Fechar aviso"
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </section>
  );
}

async function amIAdmin() {
  const { supabase } = await getAuthenticatedClient();
  const { data, error } = await supabase.rpc("is_app_admin");
  return !error && data === true;
}

/** Settings section only the Flowy team sees: send an announcement to everyone. */
export function BroadcastSection() {
  const queryClient = useQueryClient();
  const admin = useQuery({ queryKey: ["is-app-admin"], queryFn: amIAdmin, staleTime: Infinity });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!admin.data) return null;

  async function send() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; sent?: number; devices?: number };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar.");
      toast.success(`Aviso enviado. Notificação entregue em ${result.sent ?? 0} de ${result.devices ?? 0} aparelhos; todos veem no app.`);
      setTitle("");
      setBody("");
      setConfirming(false);
      await queryClient.invalidateQueries({ queryKey: ["announcement"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="broadcast-heading" className="rounded-3xl border border-primary/30 bg-primary/[0.04] p-4">
      <h2 id="broadcast-heading" className="flex items-center gap-2 text-base font-semibold">
        <Megaphone className="size-5 flowy-ink" aria-hidden="true" />
        Aviso para todos
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Só você vê esta parte. O aviso chega como notificação em quem ativou os lembretes e aparece no topo do Hoje para todo mundo.
      </p>
      <Input
        className="mt-3 h-11"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={80}
        placeholder="Título (ex.: Novidade no Flowy)"
        aria-label="Título do aviso"
      />
      <textarea
        className="mt-2 w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
        rows={4}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={500}
        placeholder="Mensagem"
        aria-label="Mensagem do aviso"
      />
      <p className="text-right text-xs text-muted-foreground">{body.length}/500</p>
      {confirming ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-500/10 p-3 text-sm">
          <span className="flex-1">Enviar para todos os usuários agora? Não dá para desfazer.</span>
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button type="button" loading={busy} onClick={() => void send()}>
            Enviar
          </Button>
        </div>
      ) : (
        <Button type="button" className="mt-2 gap-2" disabled={!title.trim() || !body.trim()} onClick={() => setConfirming(true)}>
          <Send className="size-4" aria-hidden="true" />
          Enviar para todos
        </Button>
      )}
    </section>
  );
}
