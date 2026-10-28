import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReminderSetupCard } from "@/components/system/reminder-setup";

const enable = vi.fn();
let status = "disabled";
const originalUserAgent = window.navigator.userAgent;
const originalMatchMedia = window.matchMedia;

vi.mock("@/features/settings/use-push-notifications", () => ({
  usePushNotifications: () => ({ status, busy: false, enable, disable: vi.fn(), sendTest: vi.fn() }),
}));
vi.mock("@/hooks/use-install-app", () => ({
  useInstallApp: () => ({ isInstallable: false, isInstalled: true, installApp: vi.fn() }),
}));

function installedApp(standalone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: standalone && query.includes("standalone"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  // Test files share one jsdom (isolate: false).
  window.localStorage.clear();
  document.body.classList.remove("has-overlay");
  enable.mockReset().mockResolvedValue(undefined);
  status = "disabled";
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Object.defineProperty(window.navigator, "userAgent", { value: originalUserAgent, configurable: true });
  window.matchMedia = originalMatchMedia;
});

describe("ReminderSetupCard", () => {
  it("asks once in the installed app and turns reminders on with one tap", async () => {
    installedApp(true);
    render(<ReminderSetupCard />);
    act(() => vi.advanceTimersByTime(1600));

    fireEvent.click(screen.getByRole("button", { name: "Ativar lembretes" }));
    await act(async () => {});

    expect(enable).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem("flowy:reminder-asked")).toBe("1");
  });

  it("does not ask again once answered", () => {
    installedApp(true);
    window.localStorage.setItem("flowy:reminder-asked", "1");
    render(<ReminderSetupCard />);
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.queryByRole("button", { name: "Ativar lembretes" })).toBeNull();
    // The home screen card still offers it in one tap.
    expect(screen.getByRole("button", { name: "Ativar" })).toBeTruthy();
  });

  it("'Agora não' hides the question and the card for a few days", () => {
    installedApp(true);
    render(<ReminderSetupCard />);
    act(() => vi.advanceTimersByTime(1600));

    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(window.localStorage.getItem("flowy:reminder-setup-dismissed")).not.toBeNull();
    expect(enable).not.toHaveBeenCalled();
  });

  it("does not interrupt another overlay such as the welcome tour", () => {
    installedApp(true);
    document.body.classList.add("has-overlay");
    render(<ReminderSetupCard />);
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never pops up in the phone browser, where the app must be installed first", () => {
    installedApp(false);
    Object.defineProperty(window.navigator, "userAgent", { value: "Android Mobile", configurable: true });
    render(<ReminderSetupCard />);
    act(() => vi.advanceTimersByTime(1600));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Ver como" })).toBeTruthy();
  });
});
