import { describe, expect, it } from "vitest";

import { reminderChecks, type ReminderCheckInput } from "./reminder-check";

const healthy: ReminderCheckInput = {
  status: "enabled",
  kind: "android",
  inApp: false,
  accountDevices: 1,
  thisDeviceSaved: true,
  untimedSoon: 0,
  timedSoon: 3,
  savedTimezone: "America/Sao_Paulo",
  deviceTimezone: "America/Sao_Paulo",
};

const byId = (input: ReminderCheckInput) => Object.fromEntries(reminderChecks(input).map((check) => [check.id, check]));

describe("reminderChecks", () => {
  it("is all green when everything is in place", () => {
    expect(reminderChecks(healthy).every((check) => check.ok)).toBe(true);
  });

  it("offers a repair when the server lost this device", () => {
    expect(byId({ ...healthy, thisDeviceSaved: false }).device).toMatchObject({ ok: false, fix: "repair" });
  });

  it("asks to install on an iPhone browser tab", () => {
    expect(byId({ ...healthy, status: "needs-install", kind: "iphone" }).device).toMatchObject({ ok: false, fix: "install" });
  });

  it("explains how to unblock", () => {
    const device = byId({ ...healthy, status: "denied", kind: "iphone" }).device!;
    expect(device.ok).toBe(false);
    expect(device.detail).toContain("Ajustes");
  });

  it("flags an account with no device", () => {
    expect(byId({ ...healthy, status: "disabled", accountDevices: 0 }).account!.ok).toBe(false);
  });

  it("counts tasks without a time", () => {
    const times = byId({ ...healthy, untimedSoon: 4 }).times!;
    expect(times.ok).toBe(false);
    expect(times.title).toBe("4 tarefas sem horário");
  });

  it("warns when no task has a time", () => {
    expect(byId({ ...healthy, timedSoon: 0 }).times!.ok).toBe(false);
  });

  it("warns about a different timezone", () => {
    expect(byId({ ...healthy, deviceTimezone: "Europe/Lisbon" }).timezone).toMatchObject({ ok: false, fix: "repair" });
    expect(byId(healthy).timezone).toBeUndefined();
  });
});
