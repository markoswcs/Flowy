import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { interpretTask } from "@/features/tasks/smart-task";

import { createdText, incomingMessages, intentOf, sayDate, todayText, validSignature, wallClock } from "./bot";

const webhook = (messages: unknown[]) => ({ entry: [{ changes: [{ value: { messages } }] }] });

describe("WhatsApp messages", () => {
  it("reads text messages and marks the others as having no text", () => {
    const found = incomingMessages(
      webhook([
        { id: "a", from: "5511999990000", type: "text", text: { body: " Comprar pão " } },
        { id: "b", from: "5511999990000", type: "audio" },
      ]),
    );
    expect(found).toEqual([
      { id: "a", from: "5511999990000", text: "Comprar pão" },
      { id: "b", from: "5511999990000", text: null },
    ]);
    expect(incomingMessages({ entry: [{ changes: [{ value: { statuses: [{}] } }] }] })).toEqual([]);
    expect(incomingMessages(null)).toEqual([]);
  });

  it("only accepts calls signed with the app secret", () => {
    const body = '{"entry":[]}';
    const signature = `sha256=${createHmac("sha256", "s3cret").update(body).digest("hex")}`;
    expect(validSignature(body, signature, "s3cret")).toBe(true);
    expect(validSignature(body, signature, "other")).toBe(false);
    expect(validSignature(`${body} `, signature, "s3cret")).toBe(false);
    expect(validSignature(body, null, "s3cret")).toBe(false);
  });

  it("tells a link code, help and today from a task", () => {
    expect(intentOf("483920")).toEqual({ kind: "link", code: "483920" });
    expect(intentOf("Flowy 483920")).toEqual({ kind: "link", code: "483920" });
    expect(intentOf("Oi!")).toEqual({ kind: "help" });
    expect(intentOf("Olá")).toEqual({ kind: "help" });
    expect(intentOf("hoje")).toEqual({ kind: "today" });
    expect(intentOf("O que tenho hoje?")).toEqual({ kind: "today" });
    expect(intentOf("Pagar boleto 123456 amanhã")).toEqual({ kind: "task", text: "Pagar boleto 123456 amanhã" });
  });
});

describe("the person's clock", () => {
  it("reads the time in their time zone, whatever the server's", () => {
    // 02:30 UTC on the 12th is still 23:30 on the 11th in São Paulo.
    const now = wallClock("America/Sao_Paulo", new Date("2026-11-12T02:30:00Z"));
    expect([now.getDate(), now.getHours(), now.getMinutes()]).toEqual([11, 23, 30]);
  });

  it("falls back to São Paulo for an unknown zone", () => {
    const now = wallClock("Nowhere/Invalid", new Date("2026-11-12T02:30:00Z"));
    expect(now.getHours()).toBe(23);
  });

  it("turns a message into a task with the right date", () => {
    const now = wallClock("America/Sao_Paulo", new Date("2026-11-12T02:30:00Z"));
    const task = interpretTask("Comprar remédio amanhã às 9h", { folders: [], categories: [] }, now);
    expect(task.due_date).toBe("2026-11-12");
    expect(task.due_time?.slice(0, 5)).toBe("09:00");
    expect(createdText({ ...task, recurrence: null }, now)).toContain("amanhã às 09:00");
  });
});

describe("replies", () => {
  const today = new Date(2026, 10, 11, 10, 0);

  it("says dates the way people do", () => {
    expect(sayDate("2026-11-11", today)).toBe("hoje");
    expect(sayDate("2026-11-12", today)).toBe("amanhã");
    expect(sayDate("2026-11-14", today)).toBe("sábado (14/11)");
    expect(sayDate("2026-12-20", today)).toBe("20/12");
  });

  it("lists today's tasks and flags the late ones", () => {
    const text = todayText(
      [
        { title: "Relatório", due_date: "2026-11-10", due_time: null },
        { title: "Dentista", due_date: "2026-11-11", due_time: "15:00:00" },
      ],
      today,
    );
    expect(text).toContain("*Hoje* (2)");
    expect(text).toContain("• Relatório ⚠️ atrasada");
    expect(text).toContain("• 15:00 · Dentista");
    expect(todayText([], today)).toContain("Nada para hoje");
  });
});
