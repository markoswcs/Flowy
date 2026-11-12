"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Stethoscope } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { localDateKey } from "@/features/tasks/date-utils";
import type { usePushNotifications } from "@/features/settings/use-push-notifications";
import { deviceKind, isInAppBrowser } from "@/lib/push/device-help";
import { reminderChecks, type Fix } from "@/lib/push/reminder-check";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getAuthenticatedClient } from "@/services/authenticated-client";

const checkKey = ["reminder-check"] as const;

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/** What the server knows: devices on the account, this one, tasks and timezone. */
async function loadFacts() {
  const { supabase, userId } = await getAuthenticatedClient();
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  const endpoint = (await registration?.pushManager?.getSubscription().catch(() => null))?.endpoint ?? null;
  const today = localDateKey();
  const open = () =>
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .neq("status", "completed")
      .gte("due_date", today);

  const [devices, untimed, timed, preferences] = await Promise.all([
    supabase.from("push_subscriptions").select("endpoint").eq("user_id", userId),
    open().lte("due_date", inDays(7)).is("due_time", null),
    open().not("due_time", "is", null),
    supabase.from("user_preferences").select("timezone").eq("user_id", userId).maybeSingle(),
  ]);
  const endpoints = (devices.data ?? []).map((row: { endpoint: string }) => row.endpoint);
  return {
    accountDevices: endpoints.length,
    thisDeviceSaved: Boolean(endpoint && endpoints.includes(endpoint)),
    untimedSoon: untimed.count ?? 0,
    timedSoon: timed.count ?? 0,
    savedTimezone: (preferences.data as { timezone?: string } | null)?.timezone ?? null,
  };
}

/**
 * "Checar meus lembretes": says, for this person and this device, what keeps a
 * reminder from arriving and fixes what can be fixed with one tap.
 */
export function ReminderCheckPanel({ push }: { push: ReturnType<typeof usePushNotifications> }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const facts = useQuery({ queryKey: checkKey, queryFn: loadFacts, enabled: open, staleTime: 0 });

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setOpen(true)}>
        <Stethoscope className="size-4" aria-hidden="true" />
        Checar meus lembretes
      </Button>
    );
  }

  const userAgent = navigator.userAgent;
  const checks =
    facts.data && push.status !== "loading"
      ? reminderChecks({
          ...facts.data,
          status: push.status,
          kind: deviceKind(userAgent),
          inApp: isInAppBrowser(userAgent),
          deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      : null;
  const allOk = checks?.every((check) => check.ok);

  async function fix(kind: Fix) {
    try {
      if (kind === "enable") await push.enable();
      if (kind === "repair") await push.repair();
      toast.success("Pronto, resolvido");
      await queryClient.invalidateQueries({ queryKey: checkKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível resolver.");
    }
  }

  async function test() {
    try {
      await push.sendTest();
      toast.success("Enviado. Deve chegar em alguns segundos.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-border/60 bg-card/50 p-4" aria-live="polite">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Stethoscope className="size-4 flowy-ink" aria-hidden="true" />
        Checagem dos lembretes
      </p>
      {!checks ? (
        <p className="mt-3 text-sm text-muted-foreground">{facts.isError ? "Não foi possível checar agora." : "Checando…"}</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2.5">
            {checks.map((check) => (
              <li key={check.id} className="flex gap-3">
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-label="Certo" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-500" aria-label="Atenção" />
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className={cn("font-medium", !check.ok && "text-foreground")}>{check.title}</p>
                  <p className="text-muted-foreground">{check.detail}</p>
                  {check.fix === "enable" || check.fix === "repair" ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-2"
                      loading={push.busy}
                      onClick={() => void fix(check.fix!)}
                    >
                      {check.fix === "enable" ? "Ativar agora" : "Corrigir agora"}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {push.status === "enabled" ? (
            <div className="mt-4 border-t border-border/50 pt-3 text-sm">
              <p className="text-muted-foreground">
                {allOk ? "Tudo certo por aqui. " : ""}Mande um teste: se não chegar, confira se o
                <strong className="text-foreground"> Não perturbe / Modo Foco</strong> está desligado e se as notificações
                do Flowy estão ligadas nos ajustes do celular. No Android, tire o Flowy da economia de bateria.
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-2" loading={push.busy} onClick={() => void test()}>
                Enviar notificação de teste
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
