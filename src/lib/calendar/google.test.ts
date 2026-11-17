import { describe, expect, it } from "vitest";

import { agendasToRead, taskToCalendarEvent, toCalendarEvent } from "./google";

describe("toCalendarEvent", () => {
  it("keeps all-day events without a time", () => {
    expect(toCalendarEvent({ summary: "Feriado da firma", start: { date: "2026-11-20" } }, "America/Sao_Paulo")).toEqual({
      date: "2026-11-20",
      time: null,
      title: "Feriado da firma",
    });
  });

  it("moves timed events to the viewer's timezone", () => {
    expect(toCalendarEvent({ summary: "Call", start: { dateTime: "2026-11-16T13:00:00Z" } }, "America/Sao_Paulo")).toEqual({
      date: "2026-11-16",
      time: "10:00",
      title: "Call",
    });
  });

  it("drops cancelled events and names untitled ones", () => {
    expect(toCalendarEvent({ status: "cancelled", start: { date: "2026-11-20" } }, "America/Sao_Paulo")).toBeNull();
    expect(toCalendarEvent({ start: { date: "2026-11-20" } }, "America/Sao_Paulo")?.title).toBe("(sem título)");
  });
});

describe("agendasToRead", () => {
  const agendas = [
    { id: "me@gmail.com", primary: true },
    { id: "trabalho@group.calendar.google.com", primary: false },
    { id: "guardioes@group.calendar.google.com", primary: false },
  ];

  it("reads only the main agenda until the person chooses", () => {
    expect(agendasToRead(agendas, null)).toEqual(["me@gmail.com"]);
  });

  it("reads exactly the chosen agendas", () => {
    expect(agendasToRead(agendas, ["trabalho@group.calendar.google.com"])).toEqual(["trabalho@group.calendar.google.com"]);
    // A newly added account (none of its agendas chosen) shows its main one.
    expect(agendasToRead(agendas, ["outra-conta@gmail.com"])).toEqual(["me@gmail.com"]);
  });

  it("falls back to the main agenda when the list is empty", () => {
    expect(agendasToRead([], null)).toEqual(["primary"]);
  });
});

describe("taskToCalendarEvent", () => {
  it("puts a task on its due day, as written", () => {
    expect(taskToCalendarEvent({ title: "Pagar boleto", due: "2026-11-20T00:00:00.000Z", status: "needsAction" })).toEqual({
      date: "2026-11-20",
      time: null,
      title: "Pagar boleto",
      kind: "task",
    });
  });

  it("skips done, deleted and undated tasks", () => {
    expect(taskToCalendarEvent({ title: "x", due: "2026-11-20T00:00:00.000Z", status: "completed" })).toBeNull();
    expect(taskToCalendarEvent({ title: "x", due: "2026-11-20T00:00:00.000Z", deleted: true })).toBeNull();
    expect(taskToCalendarEvent({ title: "x" })).toBeNull();
  });
});
