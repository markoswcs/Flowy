import { notify } from "@/providers/notification-provider";

// Same call shape as sonner's `toast`, but every message goes to the bell
// instead of a floating popup at the bottom of the screen.
interface ToastOptions {
  description?: string;
  action?: { label: string; onClick: () => void };
}

function send(title: string, options: ToastOptions = {}) {
  if (typeof window === "undefined") return;
  notify(title, options);
}

export const toast = Object.assign(send, {
  success: send,
  error: send,
  info: send,
});
