"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

/** The Flowy number, digits only. The section stays hidden until it is set. */
const FLOWY_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

interface WhatsAppLink {
  phone: string | null;
  code: string | null;
  code_expires_at: string | null;
}

const linkKey = ["whatsapp-link"] as const;

async function readLink(): Promise<WhatsAppLink | null> {
  const { data, error } = await createClient()
    .from("whatsapp_links")
    .select("phone, code, code_expires_at")
    .maybeSingle();
  if (error) throw error;
  return data as WhatsAppLink | null;
}

/** "+55 11 9••••-4321": enough to recognize the number without showing it all. */
export function maskPhone(phone: string) {
  const country = phone.slice(0, 2);
  const area = phone.slice(2, 4);
  return `+${country} ${area} ${phone.slice(4, 5)}••••-${phone.slice(-4)}`;
}

/** Opens WhatsApp on a chat with the Flowy number and the code already typed. */
export function chatLink(code: string) {
  return `https://wa.me/${FLOWY_NUMBER}?text=${encodeURIComponent(code)}`;
}

export function WhatsAppSection() {
  const queryClient = useQueryClient();
  const link = useQuery({
    queryKey: linkKey,
    queryFn: readLink,
    enabled: Boolean(FLOWY_NUMBER),
    // While a code waits to be sent, check every few seconds for the link.
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.code && !data.phone ? 3000 : false;
    },
  });
  const start = useMutation({
    mutationFn: async () => {
      const { error } = await createClient().rpc("start_whatsapp_link");
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linkKey }),
    onError: () => toast.error("Não foi possível gerar o código."),
  });
  const unlink = useMutation({
    mutationFn: async () => {
      const { error } = await createClient().from("whatsapp_links").delete().not("user_id", "is", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData(linkKey, null);
      toast.success("WhatsApp desconectado");
    },
    onError: () => toast.error("Não foi possível desconectar."),
  });

  if (!FLOWY_NUMBER) return null;

  const data = link.data;
  const waiting =
    data?.code && data.code_expires_at && new Date(data.code_expires_at) > new Date() ? data.code : null;

  return (
    <section aria-labelledby="whatsapp-heading">
      <h2 id="whatsapp-heading" className="text-base font-semibold">WhatsApp</h2>
      <div className="mt-3 rounded-2xl border border-border/60 bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <MessageCircle className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Anotar pelo WhatsApp</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data?.phone
                ? `Conectado ao número ${maskPhone(data.phone)}. Mande "Comprar pão amanhã 9h" para o Flowy e vira tarefa. Mande "hoje" para ver as do dia.`
                : "Mande uma mensagem para o Flowy no WhatsApp e ela vira tarefa, com data e hora."}
            </p>
          </div>
        </div>

        {data?.phone ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={`https://wa.me/${FLOWY_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants(), "h-11 flex-1")}
            >
              Abrir conversa com o Flowy
            </a>
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-muted-foreground"
              loading={unlink.isPending}
              onClick={() => unlink.mutate()}
            >
              Desconectar
            </Button>
          </div>
        ) : waiting ? (
          <div className="mt-4 space-y-3 rounded-xl bg-muted/40 p-3 text-center">
            <p className="text-sm text-muted-foreground">Envie este código para o Flowy no WhatsApp:</p>
            <p className="font-mono text-3xl font-bold tracking-[0.3em]">{waiting}</p>
            <a
              href={chatLink(waiting)}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants(), "h-11 w-full")}
            >
              Abrir o WhatsApp com o código
            </a>
            <p className="text-xs text-muted-foreground">Vale por 15 minutos. Esta tela atualiza sozinha quando conectar.</p>
          </div>
        ) : (
          <Button
            type="button"
            className="mt-4 h-11 w-full"
            loading={start.isPending || link.isLoading}
            onClick={() => start.mutate()}
          >
            Conectar meu WhatsApp
          </Button>
        )}
      </div>
    </section>
  );
}
