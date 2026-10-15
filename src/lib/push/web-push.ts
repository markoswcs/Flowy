import webpush, { WebPushError } from "web-push";

export interface StoredPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;

function configureWebPush() {
  if (configured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Web Push não configurado. Defina NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e NEXT_PUBLIC_SITE_URL.",
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

/**
 * Sends one payload to every subscription and returns the endpoints the push
 * service reported as gone (404/410), which callers should delete.
 */
export async function sendPush(
  subscriptions: StoredPushSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; expired: string[] }> {
  configureWebPush();

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        body,
        { TTL: 60 * 30, urgency: "high" },
      ),
    ),
  );

  const expired: string[] = [];
  let sent = 0;
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sent += 1;
      return;
    }
    const error = result.reason;
    if (
      error instanceof WebPushError &&
      (error.statusCode === 404 || error.statusCode === 410)
    ) {
      expired.push(subscriptions[index]!.endpoint);
    } else {
      console.error("Falha ao enviar push.", error);
    }
  });

  return { sent, expired };
}
