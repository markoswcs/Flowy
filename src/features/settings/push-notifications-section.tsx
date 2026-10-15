"use client";

import { Bell } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { usePushNotifications, type PushStatus } from "@/features/settings/use-push-notifications";

const descriptions: Record<PushStatus, string> = {
  loading: "Verificando este dispositivo…",
  unsupported: "Este navegador não suporta notificações push.",
  "needs-install":
    "No iPhone, adicione o Flowy à tela de início (Compartilhar → Adicionar à Tela de Início) e abra por lá.",
  denied: "As notificações foram bloqueadas. Libere nas configurações do navegador para este site.",
  disabled: "Receba um aviso neste dispositivo na hora de cada tarefa com horário.",
  enabled: "Este dispositivo recebe um aviso na hora de cada tarefa com horário.",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Algo deu errado.";
}

export function PushNotificationsSection() {
  const { status, busy, enable, disable, sendTest } = usePushNotifications();
  const enabled = status === "enabled";
  const canToggle = status === "enabled" || status === "disabled";

  async function toggle() {
    try {
      if (enabled) {
        await disable();
        toast.success("Notificações desativadas neste dispositivo.");
      } else {
        await enable();
        toast.success("Notificações ativadas.");
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function test() {
    try {
      await sendTest();
      toast.success("Notificação de teste enviada.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <section aria-labelledby="notifications-heading">
      <h2 id="notifications-heading" className="text-base font-semibold">Notificações</h2>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={!canToggle || busy}
        onClick={toggle}
        className="mt-4 flex w-full items-center justify-between rounded-2xl border border-border/60 bg-card/50 p-4 text-left transition-all hover:border-primary/40 hover:bg-card disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Bell className="size-5" /></span><span><span className="block text-sm font-medium">Lembretes de tarefas</span><span className="mt-0.5 block text-xs text-muted-foreground">{descriptions[status]}</span></span></span>
        <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} /></span>
      </button>
      {enabled ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" loading={busy} onClick={test}>
          Enviar notificação de teste
        </Button>
      ) : null}
    </section>
  );
}
