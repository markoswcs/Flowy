import { describe, expect, it } from "vitest";

import { agendasToRead, toCalendarEvent } from "./google";

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
    expect(agendasToRead(agendas, [])).toEqual([]);
  });

  it("falls back to the main agenda when the list is empty", () => {
    expect(agendasToRead([], null)).toEqual(["primary"]);
  });
});
