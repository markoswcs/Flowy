import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * What the Flowy number understands and answers on WhatsApp. Kept free of the
 * database and the network so it can be tested on its own; the route in
 * src/app/api/whatsapp does the reading and writing.
 */

export interface IncomingMessage {
  id: string;
  /** WhatsApp id of the sender: digits only, with country and area code. */
  from: string;
  /** Null for audio, photos, stickers… */
  text: string | null;
}

type Payload = {
  entry?: {
    changes?: {
      value?: {
        messages?: { id?: string; from?: string; type?: string; text?: { body?: string } }[];
      };
    }[];
  }[];
};

/** The messages inside a webhook call (delivery receipts carry none). */
export function incomingMessages(payload: unknown): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  for (const entry of (payload as Payload)?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (!message.id || !message.from) continue;
        out.push({
          id: message.id,
          from: message.from,
          text: message.type === "text" ? (message.text?.body ?? "").trim() || null : null,
        });
      }
    }
  }
  return out;
}

/** Meta signs each call with the app secret (X-Hub-Signature-256). */
export function validSignature(rawBody: string, header: string | null, secret: string) {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export type Intent =
  | { kind: "link"; code: string }
  | { kind: "help" }
  | { kind: "today" }
  | { kind: "task"; text: string };

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[!?.]+$/g, "")
    .trim();

export function intentOf(text: string): Intent {
  const plain = normalize(text);
  const code = plain.match(/^(?:flowy\s*)?(\d{6})$/);
  if (code) return { kind: "link", code: code[1]! };
  if (/^(oi|ola|ajuda|menu|help|comecar|inicio|bom dia|boa tarde|boa noite)$/.test(plain)) return { kind: "help" };
  if (/^(hoje|tarefas|minhas tarefas|lista|o que tenho( hoje)?|tarefas de hoje|agenda)$/.test(plain)) return { kind: "today" };
  return { kind: "task", text: text.trim() };
}

/**
 * The person's clock: a Date whose local getters (getDate, getHours…) read
 * the time in their time zone, which is what the task parser expects. The
 * server itself runs in UTC.
 */
export function wallClock(timeZone: string, at = new Date()): Date {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
  } catch {
    return wallClock("America/Sao_Paulo", at);
  }
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** "hoje", "amanhã", "sexta (14/11)" or "20/12". */
export function sayDate(day: string, today: Date) {
  const [year, month, date] = day.split("-").map(Number);
  const target = new Date(year!, month! - 1, date!);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((target.getTime() - base.getTime()) / 86_400_000);
  const short = `${String(date).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  if (days === -1) return "ontem";
  if (days > 1 && days < 7) return `${WEEKDAYS[target.getDay()]} (${short})`;
  return short;
}

export const HELP_TEXT = [
  "Oi! Eu sou o Flowy 💜",
  "",
  "Mande uma mensagem e eu viro tarefa. Exemplos:",
  "• _Comprar remédio amanhã às 9h_",
  "• _Pagar a conta de luz dia 20_",
  "• _Academia toda segunda e quarta 7h_",
  "",
  "Mande *hoje* para ver suas tarefas do dia.",
].join("\n");

export const NOT_LINKED_TEXT = [
  "Ainda não sei de quem é este número 🤔",
  "",
  "No Flowy, abra *Configurações → WhatsApp*, toque em *Conectar* e me mande o código de 6 números que aparecer.",
].join("\n");

export const NO_TEXT_TEXT = "Por enquanto eu só entendo mensagens escritas. Escreva a tarefa que eu anoto ✍️";

export function linkedText(name: string | null) {
  return [
    `Pronto${name ? `, ${name.split(" ")[0]}` : ""}! WhatsApp conectado ao seu Flowy ✅`,
    "",
    HELP_TEXT.split("\n").slice(2).join("\n"),
  ].join("\n");
}

export const BAD_CODE_TEXT =
  "Esse código não vale mais (ele dura 15 minutos). Gere outro em *Configurações → WhatsApp* e me mande de novo.";

export function createdText(
  task: { title: string; due_date: string | null; due_time: string | null; recurrence: string | null },
  today: Date,
) {
  const when = task.due_date
    ? `\n📅 ${sayDate(task.due_date, today)}${task.due_time ? ` às ${task.due_time.slice(0, 5)}` : ""}${task.recurrence ? " (repete)" : ""}`
    : "";
  return `✅ Anotado: *${task.title}*${when}`;
}

export function todayText(
  tasks: { title: string; due_date: string | null; due_time: string | null }[],
  today: Date,
) {
  if (!tasks.length) return "Nada para hoje 🎉 Mande uma mensagem se lembrar de algo.";
  const key = dateKey(today);
  const lines = tasks.slice(0, 20).map((task) => {
    const late = task.due_date && task.due_date < key ? " ⚠️ atrasada" : "";
    const time = task.due_time ? `${task.due_time.slice(0, 5)} · ` : "";
    return `• ${time}${task.title}${late}`;
  });
  const more = tasks.length > 20 ? `\n…e mais ${tasks.length - 20} no app.` : "";
  return `*Hoje* (${tasks.length})\n${lines.join("\n")}${more}`;
}

export { dateKey };
