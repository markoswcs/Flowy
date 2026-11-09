import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
let serverRows = 0;

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc,
    from: () => ({
      select: () => ({
        eq: async () => ({ count: serverRows, error: null }),
      }),
    }),
  }),
}));

const subscribe = vi.fn();
let existing: unknown = null;
const originals = {
  serviceWorker: Object.getOwnPropertyDescriptor(window.navigator, "serviceWorker"),
  PushManager: (window as unknown as Record<string, unknown>).PushManager,
  Notification: (window as unknown as Record<string, unknown>).Notification,
};

const fakeSubscription = {
  toJSON: () => ({ endpoint: "https://push.example/new", keys: { p256dh: "p", auth: "a" } }),
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "BAAA");
  rpc.mockReset().mockResolvedValue({ error: null });
  subscribe.mockReset().mockResolvedValue(fakeSubscription);
  existing = null;
  serverRows = 0;
  window.localStorage.clear();
  Object.defineProperty(window.navigator, "serviceWorker", {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: { getSubscription: async () => existing, subscribe },
      }),
    },
  });
  (window as unknown as Record<string, unknown>).PushManager = function PushManager() {};
  (window as unknown as Record<string, unknown>).Notification = { permission: "granted" };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  if (originals.serviceWorker) Object.defineProperty(window.navigator, "serviceWorker", originals.serviceWorker);
  else delete (window.navigator as unknown as Record<string, unknown>).serviceWorker;
  (window as unknown as Record<string, unknown>).PushManager = originals.PushManager;
  (window as unknown as Record<string, unknown>).Notification = originals.Notification;
});

async function sync() {
  // The VAPID key is read when the module loads.
  const { syncPushSubscription } = await import("./use-push-notifications");
  await syncPushSubscription();
}

describe("syncPushSubscription", () => {
  it("re-saves a subscription the browser still has", async () => {
    existing = fakeSubscription;
    await sync();
    expect(subscribe).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("register_push_subscription", expect.objectContaining({ p_endpoint: "https://push.example/new" }));
  });

  it("renews a subscription the phone lost while the account still expects it", async () => {
    serverRows = 1;
    await sync();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("renews it when the person said yes on this device", async () => {
    window.localStorage.setItem("flowy:push-wanted", "1");
    await sync();
    expect(subscribe).toHaveBeenCalledOnce();
  });

  it("never subscribes someone who turned reminders off here", async () => {
    window.localStorage.setItem("flowy:push-wanted", "0");
    serverRows = 1;
    await sync();
    expect(subscribe).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does nothing without a saved choice or a subscription on the account", async () => {
    await sync();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("does nothing while notifications are not allowed", async () => {
    (window as unknown as Record<string, unknown>).Notification = { permission: "default" };
    serverRows = 1;
    await sync();
    expect(subscribe).not.toHaveBeenCalled();
  });
});

describe("enable when the push service fails", () => {
  it("drops a stale subscription and tries once more", async () => {
    subscribe
      .mockRejectedValueOnce(new DOMException("Registration failed - push service error", "AbortError"))
      .mockResolvedValueOnce(fakeSubscription);
    (window as unknown as Record<string, unknown>).Notification = {
      permission: "granted",
      requestPermission: async () => "granted",
    };
    const { renderHook, act } = await import("@testing-library/react");
    const { usePushNotifications } = await import("./use-push-notifications");
    const { result } = renderHook(() => usePushNotifications());
    await act(async () => {
      await result.current.enable();
    });
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("explains in Portuguese when it keeps failing", async () => {
    subscribe.mockRejectedValue(new DOMException("Registration failed - push service error", "AbortError"));
    (window as unknown as Record<string, unknown>).Notification = {
      permission: "granted",
      requestPermission: async () => "granted",
    };
    const { renderHook, act } = await import("@testing-library/react");
    const { usePushNotifications } = await import("./use-push-notifications");
    const { result } = renderHook(() => usePushNotifications());
    let message = "";
    await act(async () => {
      await result.current.enable().catch((error: Error) => {
        message = error.message;
      });
    });
    expect(message).toMatch(/serviço de lembretes/);
    expect(rpc).not.toHaveBeenCalled();
  });
});
