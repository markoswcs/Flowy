import { blockedHelp, installHelp, type DeviceKind } from "./device-help";

export type DeviceStatus = "loading" | "unsupported" | "needs-install" | "denied" | "disabled" | "enabled";

export interface ReminderCheckInput {
  status: DeviceStatus;
  kind: DeviceKind;
  inApp: boolean;
  /** Devices saved on the account (every phone and computer). */
  accountDevices: number;
  /** This browser's subscription is saved on the account. */
  thisDeviceSaved: boolean;
  /** Open tasks from today to a week ahead with a date but no time. */
  untimedSoon: number;
  /** Open tasks from today on with a time: these are the ones that remind. */
  timedSoon: number;
  savedTimezone: string | null;
  deviceTimezone: string;
}

export type Fix = "install" | "enable" | "repair";

export interface ReminderCheck {
  id: "device" | "account" | "times" | "timezone";
  ok: boolean;
  title: string;
  detail: string;
  fix?: Fix;
}

/**
 * Why reminders may not arrive, in the order a person can fix it: this device,
 * the account, the tasks themselves (no time means no reminder at that time)
 * and the timezone the server uses to know when "15h" is.
 */
export function reminderChecks(input: ReminderCheckInput): ReminderCheck[] {
  const checks: ReminderCheck[] = [];

  if (input.status === "enabled" && input.thisDeviceSaved) {
    checks.push({ id: "device", ok: true, title: "Este aparelho recebe lembretes", detail: "Permissão dada e aparelho salvo na sua conta." });
  } else if (input.status === "enabled") {
    checks.push({
      id: "device",
      ok: false,
      title: "Este aparelho saiu da lista",
      detail: "As notificações estão permitidas, mas o servidor não tem mais este aparelho. Um toque resolve.",
      fix: "repair",
    });
  } else if (input.status === "needs-install" || input.status === "unsupported") {
    checks.push({ id: "device", ok: false, title: "Instale o Flowy", detail: installHelp(input.kind, input.inApp), fix: "install" });
  } else if (input.status === "denied") {
    checks.push({ id: "device", ok: false, title: "Notificações bloqueadas", detail: blockedHelp(input.kind) });
  } else if (input.status === "disabled") {
    checks.push({
      id: "device",
      ok: false,
      title: "Lembretes desligados neste aparelho",
      detail: "Ative para receber o aviso na hora de cada tarefa.",
      fix: "enable",
    });
  }

  if (input.accountDevices === 0) {
    checks.push({
      id: "account",
      ok: false,
      title: "Nenhum aparelho recebe seus lembretes",
      detail: "Sem um aparelho ativado, nenhum aviso sai. Ative no celular que você usa todo dia.",
    });
  } else {
    checks.push({
      id: "account",
      ok: true,
      title: input.accountDevices === 1 ? "1 aparelho recebe seus lembretes" : `${input.accountDevices} aparelhos recebem seus lembretes`,
      detail: "Ative também no celular ou no computador para receber nos dois.",
    });
  }

  if (input.untimedSoon > 0) {
    const n = input.untimedSoon;
    checks.push({
      id: "times",
      ok: false,
      title: n === 1 ? "1 tarefa sem horário" : `${n} tarefas sem horário`,
      detail: `Nos próximos 7 dias, ${n === 1 ? "ela não avisa" : "elas não avisam"} na hora: só ${n === 1 ? "aparece" : "aparecem"} no resumo das 8h. Para receber o aviso, coloque um horário (ex.: "dentista amanhã 15h").`,
    });
  } else if (input.timedSoon === 0) {
    checks.push({
      id: "times",
      ok: false,
      title: "Nenhuma tarefa com horário",
      detail: 'O aviso sai na hora marcada da tarefa. Crie uma com horário, como "ligar para a escola hoje 16h".',
    });
  } else {
    checks.push({ id: "times", ok: true, title: "Suas tarefas têm horário", detail: "Cada uma avisa na hora marcada." });
  }

  if (input.savedTimezone && input.savedTimezone !== input.deviceTimezone) {
    checks.push({
      id: "timezone",
      ok: false,
      title: "Fuso horário diferente",
      detail: `O servidor usa ${input.savedTimezone}, mas este aparelho está em ${input.deviceTimezone}. Os avisos podem chegar na hora errada.`,
      fix: input.status === "enabled" ? "repair" : undefined,
    });
  }

  return checks;
}
