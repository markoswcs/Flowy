"use client";

import { Bell, Sunrise } from "lucide-react";
import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { SwitchRow } from "@/components/ui/switch-row";
import { usePushNotifications, type PushStatus } from "@/features/settings/use-push-notifications";
import { usePreferences, useUpdatePreferences } from "@/features/settings/use-settings";

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
  const preferences = usePreferences();
  const updatePreferences = useUpdatePreferences();
  // Rows created before the column existed read as on, like the database default.
  const digestOn = preferences.data?.morning_digest !== false;

  function toggleDigest() {
    updatePreferences.mutate(
      { morning_digest: !digestOn },
      {
        onSuccess: () =>
          toast.success(digestOn ? "Resumo da manhã desativado" : "Resumo da manhã ativado"),
        onError: () => toast.error("Não foi possível salvar a preferência."),
      },
    );
  }

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
        <SwitchRow
          icon={<Sunrise className="size-5" />}
          title="Resumo da manhã"
          description="Às 8h, um aviso com as tarefas de hoje e as atrasadas, inclusive as sem horário."
          checked={digestOn}
          disabled={!preferences.data || updatePreferences.isPending}
          onToggle={toggleDigest}
        />
      ) : null}
      {enabled ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" loading={busy} onClick={test}>
          Enviar notificação de teste
        </Button>
      ) : null}
    </section>
  );
}
