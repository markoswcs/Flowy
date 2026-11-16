"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeFeedUrl } from "@/lib/calendar/ics";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

const HELP = [
  {
    name: "Gmail / Google Agenda",
    steps: "No computador, abra calendar.google.com → ⚙ Configurações → clique na sua agenda → “Endereço secreto no formato iCal” → copie.",
  },
  {
    name: "Outlook / Hotmail",
    steps: "Em outlook.com → ⚙ Configurações → Calendário → Calendários compartilhados → Publicar um calendário → “Pode ver todos os detalhes” → copie o link ICS.",
  },
  {
    name: "iCloud (iPhone)",
    steps: "No app Calendário, toque em ⓘ ao lado da agenda → ligue “Agenda Pública” → Compartilhar Link → copie.",
  },
];

async function readSaved(): Promise<string> {
  const { data } = await createClient().auth.getUser();
  const value = data.user?.user_metadata?.calendar_feed_url;
  return typeof value === "string" ? value : "";
}

/**
 * Links the calendar of the person's e-mail account (read only): its events
 * show in Flowy's calendar next to the tasks. The link stays in their account.
 */
export function CalendarFeedSection() {
  const queryClient = useQueryClient();
  const saved = useQuery({ queryKey: ["calendar-feed-url"], queryFn: readSaved });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

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

  function connect() {
    const url = normalizeFeedUrl(draft);
    if (!url) {
      toast.error("Esse link não parece ser de agenda do Google, Outlook ou iCloud.");
      return;
    }
    void save(url);
  }

  return (
    <section id="agenda" aria-labelledby="agenda-heading" className="scroll-mt-24">
      <h2 id="agenda-heading" className="flex items-center gap-2 text-base font-semibold">
        <CalendarDays className="size-5 flowy-ink" aria-hidden="true" />
        Agenda do e-mail
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Veja no Calendário do Flowy os compromissos da agenda do seu e-mail. O Flowy só lê, nunca altera nada lá.
      </p>

      {saved.data ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
          <Check className="size-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Conectada: {new URL(saved.data).hostname}</span>
          <Button type="button" variant="ghost" size="sm" loading={busy} onClick={() => void save(null)}>
            Desconectar
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Cole aqui o link da sua agenda (iCal)"
              aria-label="Link da agenda"
              inputMode="url"
              className="h-11"
            />
            <Button type="button" className="h-11" loading={busy} disabled={!draft.trim()} onClick={connect}>
              Conectar
            </Button>
          </div>
          <details className="mt-3 rounded-2xl border border-border/60 bg-card/40 p-3 text-sm">
            <summary className="cursor-pointer font-medium">Onde pego esse link?</summary>
            <ul className="mt-2 space-y-2 text-muted-foreground">
              {HELP.map((item) => (
                <li key={item.name}>
                  <strong className="text-foreground">{item.name}:</strong> {item.steps}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
