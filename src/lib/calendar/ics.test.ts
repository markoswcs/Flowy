import { describe, expect, it } from "vitest";

import { eventsBetween, normalizeFeedUrl } from "./ics";

const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "UID:a",
  "SUMMARY:Dentista",
  "DTSTART:20261116T130000Z",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:b",
  "SUMMARY:Aniversário da Ana",
  "DTSTART;VALUE=DATE:20261120",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:c",
  "SUMMARY:Aula de inglês\\, turma B",
  "DTSTART;TZID=America/Sao_Paulo:20261102T190000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=6",
  "EXDATE;TZID=America/Sao_Paulo:20261111T190000",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:d",
  "SUMMARY:Cancelado",
  "STATUS:CANCELLED",
  "DTSTART:20261117T120000Z",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:e",
  "SUMMARY:Reunião longa com um título que",
  "  continua na outra linha",
  "DTSTART;TZID=Europe/Lisbon:20261118T150000",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("eventsBetween", () => {
  const events = eventsBetween(ICS, "2026-11-01", "2026-11-30", "America/Sao_Paulo");

  it("converts UTC times to the viewer's timezone", () => {
    expect(events).toContainEqual({ date: "2026-11-16", time: "10:00", title: "Dentista" });
  });

  it("keeps all-day events without a time", () => {
    expect(events).toContainEqual({ date: "2026-11-20", time: null, title: "Aniversário da Ana" });
  });

  it("repeats weekly on the given days, skipping excluded dates", () => {
    const english = events.filter((event) => event.title === "Aula de inglês, turma B").map((event) => event.date);
    expect(english).toEqual(["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-16", "2026-11-18"]);
  });

  it("drops cancelled events and joins folded lines", () => {
    expect(events.some((event) => event.title === "Cancelado")).toBe(false);
    expect(events).toContainEqual({ date: "2026-11-18", time: "12:00", title: "Reunião longa com um título que continua na outra linha" });
  });
});

describe("normalizeFeedUrl", () => {
  it("accepts calendar links from Google, Outlook and iCloud", () => {
    expect(normalizeFeedUrl("https://calendar.google.com/calendar/ical/x/private-y/basic.ics")).toContain("calendar.google.com");
    expect(normalizeFeedUrl("webcal://p42-caldav.icloud.com/published/2/abc")).toBe("https://p42-caldav.icloud.com/published/2/abc");
    expect(normalizeFeedUrl("https://outlook.office365.com/owa/calendar/a/b/calendar.ics")).toBeTruthy();
  });

  it("refuses anything else", () => {
    expect(normalizeFeedUrl("http://calendar.google.com/x.ics")).toBeNull();
    expect(normalizeFeedUrl("https://evil.example/calendar.ics")).toBeNull();
    expect(normalizeFeedUrl("https://calendar.google.com.evil.example/x")).toBeNull();
    expect(normalizeFeedUrl("não é link")).toBeNull();
  });
});
