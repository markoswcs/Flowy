"use client";

import { useCallback, useEffect, useState } from "react";

import { isPushServiceError, pushServiceHelp } from "@/lib/push/device-help";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";
import { createClient } from "@/lib/supabase/client";

export type PushStatus =
  | "loading"
  | "unsupported"
  | "needs-install"
  | "denied"
  | "disabled"
  | "enabled";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
/**
 * "1" while the person wants reminders on this device, so a lost subscription
 * is renewed; "0" once they turned them off here, so it never comes back alone.
 */
const WANTED_KEY = "flowy:push-wanted";

function setWanted(wanted: boolean) {
  try {
    window.localStorage.setItem(WANTED_KEY, wanted ? "1" : "0");
  } catch {
    // Private mode: an existing subscription is still renewed on its own.
  }
}

function wantedChoice(): "yes" | "no" | "unknown" {
  try {
    const value = window.localStorage.getItem(WANTED_KEY);
    return value === "1" ? "yes" : value === "0" ? "no" : "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Whether the account still has a subscription saved for this browser. Turning
 * reminders off deletes it, so one left over means the phone lost its
 * subscription on its own (older installs never saved the choice above).
 */
async function serverExpectsThisDevice() {
  const { count, error } = await createClient()
    .from("push_subscriptions")
    .select("endpoint", { count: "exact", head: true })
    .eq("user_agent", navigator.userAgent);
  return !error && (count ?? 0) > 0;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

async function detectStatus(): Promise<PushStatus> {
  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "enabled" : "disabled";
}

/**
 * Subscribes this browser. "Registration failed - push service error" means the
 * browser could not reach its push service; a stale subscription is a common
 * cause, so it is dropped and one more try made before explaining in Portuguese.
 */
async function subscribe(registration: ServiceWorkerRegistration, vapidKey: string) {
  const options = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) };
  try {
    return await registration.pushManager.subscribe(options);
  } catch (error) {
    if (!isPushServiceError(error)) throw error;
    await (await registration.pushManager.getSubscription())?.unsubscribe().catch(() => false);
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    try {
      return await registration.pushManager.subscribe(options);
    } catch (retryError) {
      if (!isPushServiceError(retryError)) throw retryError;
      throw new Error(pushServiceHelp(navigator.userAgent, "brave" in navigator));
    }
  }
}

/** Saves this browser's subscription (creating it if needed) on the signed-in account. */
async function registerSubscription(vapidKey: string) {
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ?? (await subscribe(registration, vapidKey));

  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    throw new Error("O navegador retornou uma inscrição inválida.");
  }

  const { error } = await createClient().rpc("register_push_subscription", {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: navigator.userAgent,
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Lets the server drop this browser's subscription on another address.
    p_origin: window.location.origin,
  });
  if (error) throw new Error("Não foi possível salvar este dispositivo.");
}

/**
 * Re-saves the subscription when the app opens, if notifications are allowed.
 * The server forgets a device when the push service reports it gone, when the
 * browser rotates its subscription or when another account signs in on it;
 * without this the phone would still say "ativado" and silently get nothing.
 * It also keeps the saved timezone in step after travelling.
 */
export async function syncPushSubscription() {
  const supported =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported || !VAPID_PUBLIC_KEY || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker.ready;
  if (!(await registration.pushManager.getSubscription())) {
    // The phone lost its subscription. Renew it unless the person turned
    // reminders off here; never subscribe someone who chose that.
    const choice = wantedChoice();
    if (choice === "no") return;
    if (choice === "unknown" && !(await serverExpectsThisDevice())) return;
  }
  await registerSubscription(VAPID_PUBLIC_KEY);
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    detectStatus()
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => {
        if (active) setStatus("unsupported");
      });
    return () => {
      active = false;
    };
  }, []);

  const enable = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) throw new Error("Notificações não configuradas no servidor.");
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "disabled");
        throw new Error("Permissão de notificação não concedida.");
      }

      await registerSubscription(VAPID_PUBLIC_KEY);
      setWanted(true);
      setStatus("enabled");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await createClient()
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setWanted(false);
      setStatus("disabled");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Não foi possível enviar o teste.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, enable, disable, sendTest };
}
