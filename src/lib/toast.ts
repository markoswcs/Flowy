import { notify, type NotificationTone } from "@/providers/notification-provider";

// Same call shape as sonner's `toast`, but every message goes to the bell
// instead of a floating popup at the bottom of the screen.
interface ToastOptions {
  description?: string;
  action?: { label: string; onClick: () => void };
}

function sender(tone: NotificationTone) {
  return (title: string, options: ToastOptions = {}) => {
    if (typeof window === "undefined") return;
    notify(title, { ...options, tone });
  };
}

export const toast = Object.assign(sender("success"), {
  success: sender("success"),
  error: sender("error"),
  info: sender("info"),
});
