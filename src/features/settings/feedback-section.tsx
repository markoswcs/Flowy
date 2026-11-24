"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bug,
  Check,
  CheckCheck,
  Copy,
  Eye,
  Inbox,
  Lightbulb,
  Loader2,
  MessageCircle,
  Send,
} from "lucide-react";
import { useState } from "react";

import { amIAdmin } from "@/features/announcements/announcements";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { notify } from "@/providers/notification-provider";
import { messageFromUnknownError } from "@/services/authenticated-client";
import {
  listFeedback,
  sendFeedback,
  setFeedbackStatus,
  type Feedback,
  type FeedbackKind,
  type FeedbackStatus,
} from "@/services/feedback";

const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

const KINDS: {
  kind: FeedbackKind;
  label: string;
  icon: typeof Bug;
  tone: string;
  placeholder: string;
}[] = [
  {
    kind: "bug",
    label: "Problema",
    icon: Bug,
    tone: "text-rose-400 bg-rose-500/15",
    placeholder:
      "O que aconteceu? Em qual tela? O que você esperava que acontecesse?",
  },
  {
    kind: "idea",
    label: "Ideia",
    icon: Lightbulb,
    tone: "text-amber-400 bg-amber-500/15",
    placeholder: "O que deixaria o Flowy melhor para você?",
  },
  {
    kind: "other",
    label: "Outro",
    icon: MessageCircle,
    tone: "text-sky-400 bg-sky-500/15",
    placeholder: "Conte o que quiser.",
  },
];
const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: "Problema",
  idea: "Ideia",
  other: "Outro",
};
const STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "Novo",
  seen: "Visto",
  done: "Resolvido",
};
const STATUS_TONE: Record<FeedbackStatus, string> = {
  new: "bg-violet-500/20 text-violet-200",
  seen: "bg-sky-500/15 text-sky-300",
  done: "bg-emerald-500/15 text-emerald-300",
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** Everyone: tell the Flowy team about a problem, an idea or anything else. */
export function FeedbackForm() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [message, setMessage] = useState("");
  const mine = useQuery({
    queryKey: ["feedback", "mine"],
    queryFn: () => listFeedback(true),
    staleTime: 60_000,
  });
  const send = useMutation({
    mutationFn: () =>
      sendFeedback({
        kind,
        message,
        page: document.referrer
          ? new URL(document.referrer).pathname
          : undefined,
        app_version: VERSION,
      }),
    onSuccess: () => {
      setMessage("");
      notify("Recebido! Obrigado por ajudar a melhorar o Flowy.");
      void queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
    onError: (error) =>
      toast.error("Não foi possível enviar.", {
        description: messageFromUnknownError(error),
      }),
  });
  const current = KINDS.find((item) => item.kind === kind)!;
  const ready = message.trim().length >= 3;

  return (
    <div>
      <div
        className="grid grid-cols-3 gap-2"
        role="radiogroup"
        aria-label="Tipo de mensagem"
      >
        {KINDS.map(({ kind: value, label, icon: Icon, tone }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => setKind(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-semibold transition-all",
              kind === value
                ? "border-primary/60 bg-primary/[0.1]"
                : "border-border/60 text-muted-foreground hover:bg-muted/30",
            )}
          >
            <span
              className={cn("grid size-9 place-items-center rounded-xl", tone)}
            >
              <Icon className="size-[18px]" />
            </span>
            {label}
          </button>
        ))}
      </div>
      <form
        className="mt-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !send.isPending) send.mutate();
        }}
      >
        <label htmlFor="feedback-message" className="sr-only">
          Sua mensagem
        </label>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(event) => setMessage(event.target.value.slice(0, 2000))}
          placeholder={current.placeholder}
          rows={4}
          className="w-full resize-none rounded-2xl border border-border/70 bg-background/60 p-3.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {message.length}/2000
          </span>
          <button
            type="submit"
            disabled={!ready || send.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {send.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Enviar
          </button>
        </div>
      </form>

      {mine.data?.length ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Seus envios
          </p>
          <ul className="mt-2 space-y-1.5">
            {mine.data.slice(0, 5).map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2.5 rounded-xl bg-muted/25 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{item.message}</span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    STATUS_TONE[item.status],
                  )}
                >
                  {STATUS_LABEL[item.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function asText(items: Feedback[]) {
  const lines = items.map((item, index) =>
    [
      `#${index + 1} · ${KIND_LABEL[item.kind]} · ${STATUS_LABEL[item.status]} · ${when(item.created_at)}`,
      `De: ${item.author_name ?? "—"}${item.author_email ? ` <${item.author_email}>` : ""}`,
      item.page ? `Tela: ${item.page}` : null,
      item.app_version ? `Versão: ${item.app_version}` : null,
      "",
      item.message.trim(),
    ]
      .filter((line) => line !== null)
      .join("\n"),
  );
  return `Feedbacks do Flowy (${items.length})\n\n${lines.join("\n\n---\n\n")}`;
}

type Filter = "all" | FeedbackKind;

/** Admins only: every message people sent, with filters, status and "Copiar tudo". */
export function FeedbackInbox() {
  const queryClient = useQueryClient();
  const admin = useQuery({
    queryKey: ["is-app-admin"],
    queryFn: amIAdmin,
    staleTime: Infinity,
  });
  const all = useQuery({
    queryKey: ["feedback", "all"],
    queryFn: () => listFeedback(false),
    enabled: admin.data === true,
    staleTime: 30_000,
  });
  const [filter, setFilter] = useState<Filter>("all");
  const [hideDone, setHideDone] = useState(true);
  const [copied, setCopied] = useState(false);
  const status = useMutation({
    mutationFn: ({ id, value }: { id: string; value: FeedbackStatus }) =>
      setFeedbackStatus(id, value),
    onMutate: ({ id, value }) => {
      queryClient.setQueryData<Feedback[]>(["feedback", "all"], (list) =>
        list?.map((item) =>
          item.id === id ? { ...item, status: value } : item,
        ),
      );
    },
    onError: () => {
      toast.error("Não foi possível mudar o status.");
      void queryClient.invalidateQueries({ queryKey: ["feedback", "all"] });
    },
  });
  if (!admin.data) return null;

  const items = all.data ?? [];
  const shown = items.filter(
    (item) =>
      (filter === "all" || item.kind === filter) &&
      (!hideDone || item.status !== "done"),
  );
  const count = (kind: Filter) =>
    items.filter(
      (item) =>
        (kind === "all" || item.kind === kind) && item.status !== "done",
    ).length;
  const fresh = items.filter((item) => item.status === "new").length;

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(asText(shown));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <section
      aria-labelledby="inbox-heading"
      className="rounded-[1.75rem] border border-primary/30 bg-primary/[0.04] p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Inbox className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="inbox-heading" className="text-lg font-bold leading-tight">
            Feedbacks recebidos
          </h2>
          <p className="text-sm text-muted-foreground">
            {fresh ? `${fresh} ${fresh === 1 ? "novo" : "novos"} · ` : ""}
            {items.length} no total
          </p>
        </div>
        <button
          type="button"
          onClick={copyAll}
          disabled={!shown.length}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copiado" : "Copiar tudo"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {(["all", "bug", "idea", "other"] as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "all" ? "Todos" : KIND_LABEL[value]}
            <span className="tabular-nums opacity-70">{count(value)}</span>
          </button>
        ))}
        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(event) => setHideDone(event.target.checked)}
            className="size-3.5 rounded accent-[hsl(var(--primary))]"
          />
          Esconder resolvidos
        </label>
      </div>

      {all.isLoading ? (
        <p className="mt-6 flex justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </p>
      ) : shown.length ? (
        <ul className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
          {shown.map((item) => {
            const kind = KINDS.find((entry) => entry.kind === item.kind)!;
            const Icon = kind.icon;
            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-2xl border border-border/60 bg-card/60 p-3.5",
                  item.status === "new" && "border-violet-400/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl",
                      kind.tone,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {item.author_name ?? "Sem nome"}
                      </span>
                      {item.author_email ? (
                        <span className="truncate">{item.author_email}</span>
                      ) : null}
                      <span>· {when(item.created_at)}</span>
                      {item.app_version ? (
                        <span>· v{item.app_version}</span>
                      ) : null}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6">
                      {item.message}
                    </p>
                    {item.page ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Tela: {item.page}
                      </p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {(["new", "seen", "done"] as FeedbackStatus[]).map(
                        (value) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={item.status === value}
                            onClick={() =>
                              status.mutate({ id: item.id, value })
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                              item.status === value
                                ? STATUS_TONE[value]
                                : "bg-muted/30 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {value === "seen" ? (
                              <Eye className="size-3" />
                            ) : value === "done" ? (
                              <CheckCheck className="size-3" />
                            ) : null}
                            {STATUS_LABEL[value]}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {all.isError
            ? "Rode a atualização do banco do feedback para ver as mensagens."
            : "Nada por aqui."}
        </p>
      )}
    </section>
  );
}
