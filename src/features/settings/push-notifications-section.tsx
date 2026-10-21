"use client";

import { Bell } from "lucide-react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { SwitchRow } from "@/components/ui/switch-row";
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
        toast.success("Notificações desativadas");
      } else {
        await enable();
        toast.success("Notificações ativadas");
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
      <SwitchRow
        icon={<Bell className="size-5" />}
        title="Lembretes de tarefas"
        description={descriptions[status]}
        checked={enabled}
        disabled={!canToggle || busy}
        onToggle={toggle}
      />
      {enabled ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" loading={busy} onClick={test}>
          Enviar notificação de teste
        </Button>
      ) : null}
    </section>
  );
}
