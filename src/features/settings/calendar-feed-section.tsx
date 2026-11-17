"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ClipboardPaste, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeFeedUrl } from "@/lib/calendar/ics";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

/** Where each service keeps its calendar link, opened in one tap. */
const LINK_SOURCES = [
  {
    name: "Google",
    open: "https://calendar.google.com/calendar/r/settings",
    steps: "Clique na sua agenda, à esquerda → role até “Endereço secreto no formato iCal” → copie.",
  },
  {
    name: "Outlook",
    open: "https://outlook.live.com/calendar/0/options/calendar/SharedCalendars",
    steps: "Em “Publicar um calendário”, escolha “Pode ver todos os detalhes” → Publicar → copie o link ICS.",
  },
  {
    name: "iCloud",
    open: null,
    steps: "No iPhone: app Calendário → Calendários → ⓘ ao lado da agenda → ligue “Agenda Pública” → copie o link.",
  },
];

const RESULT_TEXT: Record<string, [string, "success" | "error"]> = {
  conectada: ["Google Agenda conectada: seus compromissos já aparecem no Calendário", "success"],
  cancelado: ["Conexão cancelada", "error"],
  "sem-permissao": ["Marque a permissão de ver a agenda na tela do Google e tente de novo", "error"],
  indisponivel: ["A conexão com o Google ainda não está disponível. Use o link abaixo", "error"],
  erro: ["Não foi possível conectar. Tente de novo", "error"],
};

async function readSaved(): Promise<string> {
  const { data } = await createClient().auth.getUser();
  const value = data.user?.user_metadata?.calendar_feed_url;
  return typeof value === "string" ? value : "";
}

async function readGoogle(): Promise<{ available: boolean; connected: boolean; email?: string | null; tasks?: boolean }> {
  const response = await fetch("/api/calendar/google/status");
  if (!response.ok) return { available: false, connected: false };
  return response.json();
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h6a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.8 3.3-8.1Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.6-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

interface AgendaList {
  agendas: { id: string; name: string; color: string | null; primary: boolean }[];
  chosen: string[] | null;
  error?: string;
}

async function readAgendas(): Promise<AgendaList> {
  const response = await fetch("/api/calendar/google/agendas");
  if (!response.ok) return { agendas: [], chosen: null };
  return response.json();
}

/** Which Google agendas show in Flowy. Until chosen, only the main one. */
function AgendaPicker() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["calendar-google-agendas"], queryFn: readAgendas });
  const [saving, setSaving] = useState(false);
  const agendas = list.data?.agendas ?? [];
  if (list.isLoading) return <p className="mt-2 text-xs text-muted-foreground">Carregando suas agendas…</p>;
  if (list.data?.error) return <p className="mt-2 text-xs text-amber-300">{list.data.error}</p>;
  if (agendas.length < 2) return null;
  const chosen = list.data?.chosen ?? agendas.filter((agenda) => agenda.primary).map((agenda) => agenda.id);

  async function toggle(id: string) {
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id];
    setSaving(true);
    try {
      const { error } = await createClient().auth.updateUser({ data: { google_agendas: next } });
      if (error) throw error;
      queryClient.setQueryData<AgendaList>(["calendar-google-agendas"], (current) => (current ? { ...current, chosen: next } : current));
      await queryClient.invalidateQueries({ queryKey: ["calendar-feed"] });
    } catch {
      toast.error("Não foi possível salvar. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <fieldset className="mt-3 rounded-2xl border border-border/60 bg-card/40 p-3" disabled={saving}>
      <legend className="px-1 text-sm font-medium">Quais agendas mostrar no Flowy</legend>
      <ul className="mt-1 space-y-1">
        {agendas.map((agenda) => (
          <li key={agenda.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-muted/40">
              <input
                type="checkbox"
                checked={chosen.includes(agenda.id)}
                onChange={() => void toggle(agenda.id)}
                className="size-4 accent-[hsl(var(--primary))]"
              />
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: agenda.color ?? "#38bdf8" }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{agenda.name}</span>
              {agenda.primary ? <span className="text-xs text-muted-foreground">principal</span> : null}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/**
 * The calendar of the person's e-mail in Flowy's calendar (read only). Google:
 * one button. Outlook / iCloud: open the right page, copy, tap "Colar link".
 */
export function CalendarFeedSection() {
  const queryClient = useQueryClient();
  const saved = useQuery({ queryKey: ["calendar-feed-url"], queryFn: readSaved });
  const google = useQuery({ queryKey: ["calendar-google"], queryFn: readGoogle });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLink, setShowLink] = useState(false);

  // Coming back from Google: say how it went, once.
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("agenda");
    if (!result) return;
    url.searchParams.delete("agenda");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    const [text, kind] = RESULT_TEXT[result] ?? RESULT_TEXT.erro!;
    if (kind === "success") toast.success(text);
    else toast.error(text);
    void queryClient.invalidateQueries({ queryKey: ["calendar-feed"] });
  }, [queryClient]);

  async function save(value: string | null) {
    setBusy(true);
    try {
      const { error } = await createClient().auth.updateUser({ data: { calendar_feed_url: value } });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["calendar-feed-url"] });
      await queryClient.invalidateQueries({ queryKey: ["calendar-feed"] });
      setDraft("");
      toast.success(value ? "Agenda conectada: os compromissos aparecem no Calendário" : "Agenda desconectada");
    } catch {
      toast.error("Não foi possível salvar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  function connect(raw: string) {
    const url = normalizeFeedUrl(raw);
    if (!url) {
      toast.error("Esse link não parece ser de agenda do Google, Outlook ou iCloud.");
      return;
    }
    void save(url);
  }

  async function pasteAndConnect() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) throw new Error("vazio");
      setDraft(text);
      connect(text);
    } catch {
      toast.error("Não consegui ler o link copiado. Cole no campo abaixo.");
      setShowLink(true);
    }
  }

  async function disconnectGoogle() {
    setBusy(true);
    try {
      await fetch("/api/calendar/google/status", { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["calendar-google"] });
      await queryClient.invalidateQueries({ queryKey: ["calendar-feed"] });
      toast.success("Google Agenda desconectada");
    } finally {
      setBusy(false);
    }
  }

  const googleOn = google.data?.connected;
  const linkOn = Boolean(saved.data);

  return (
    <section id="agenda" aria-labelledby="agenda-heading" className="scroll-mt-24">
      <h2 id="agenda-heading" className="flex items-center gap-2 text-base font-semibold">
        <CalendarDays className="size-5 flowy-ink" aria-hidden="true" />
        Agenda do e-mail
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Seus compromissos aparecem no Calendário do Flowy. O Flowy só lê, nunca altera nada.
      </p>

      {googleOn ? (
        <>
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <GoogleMark />
          <span className="min-w-0 flex-1 truncate">Google Agenda conectada{google.data?.email ? ` · ${google.data.email}` : ""}</span>
          <Button type="button" variant="ghost" size="sm" loading={busy} onClick={() => void disconnectGoogle()}>
            Desconectar
          </Button>
        </div>
        {google.data?.tasks === false ? (
          <a
            href="/api/calendar/google/start"
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-3 py-3 text-sm font-semibold text-sky-200"
          >
            <GoogleMark />
            Trazer também as Tarefas do Google
          </a>
        ) : null}
        <AgendaPicker />
        </>
      ) : linkOn ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <Check className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Conectada: {new URL(saved.data!).hostname}</span>
          <Button type="button" variant="ghost" size="sm" loading={busy} onClick={() => void save(null)}>
            Desconectar
          </Button>
        </div>
      ) : (
        <>
          {google.data?.available ? (
            <a
              href="/api/calendar/google/start"
              className="mt-3 flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-white text-sm font-semibold text-neutral-900 shadow-sm transition-transform active:scale-[0.98]"
            >
              <GoogleMark />
              Conectar Google Agenda
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => setShowLink(!showLink)}
            className="mt-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {google.data?.available ? "Usa Outlook ou iCloud? Conectar pelo link" : "Conectar pelo link da agenda"}
          </button>

          {showLink || !google.data?.available ? (
            <div className="mt-3 space-y-3">
              <ol className="space-y-2">
                {LINK_SOURCES.filter((source) => !google.data?.available || source.name !== "Google").map((source) => (
                  <li key={source.name} className="rounded-2xl border border-border/60 bg-card/40 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <strong>{source.name}</strong>
                      {source.open ? (
                        <a
                          href={source.open}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold flowy-ink"
                        >
                          Abrir
                          <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                    <p className="mt-1 text-muted-foreground">{source.steps}</p>
                  </li>
                ))}
              </ol>
              <Button type="button" className="h-11 w-full gap-2" loading={busy} onClick={() => void pasteAndConnect()}>
                <ClipboardPaste className="size-4" aria-hidden="true" />
                Já copiei: colar link
              </Button>
              <div className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ou cole o link aqui"
                  aria-label="Link da agenda"
                  inputMode="url"
                  className="h-11"
                />
                <Button type="button" variant="outline" className="h-11" disabled={!draft.trim() || busy} onClick={() => connect(draft)}>
                  Conectar
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
