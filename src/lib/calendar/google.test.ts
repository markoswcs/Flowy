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
  it("reads the main agenda and the other checked ones, never holidays", () => {
    expect(
      agendasToRead([
        { id: "me@gmail.com", primary: true },
        { id: "trabalho@group.calendar.google.com", selected: true },
        { id: "escondida@group.calendar.google.com", selected: true, hidden: true },
        { id: "desmarcada@group.calendar.google.com", selected: false },
        { id: "pt-br.brazilian#holiday@group.v.calendar.google.com", selected: true },
      ]),
    ).toEqual(["me@gmail.com", "trabalho@group.calendar.google.com"]);
  });

  it("falls back to the main agenda", () => {
    expect(agendasToRead([])).toEqual(["primary"]);
  });
});
