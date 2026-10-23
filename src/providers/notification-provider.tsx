"use client";

import { AlertCircle, Check, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type NotificationTone = "success" | "error" | "info";
type Notification = {
  id: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  tone?: NotificationTone;
  leaving?: boolean;
};
type NewNotification = Omit<Notification, "id" | "leaving">;
type NotificationsContextValue = {
  addNotification: (notification: NewNotification) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const notificationEvent = "flowy:add-notification";
// One banner at a time: a new message replaces the current one.
const VISIBLE = 1;
const EXIT_MS = 160;

const TONE_ICON = {
  success: <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />,
  error: <AlertCircle className="size-3.5" aria-hidden="true" />,
  info: <Info className="size-3.5" aria-hidden="true" />,
};

export function notify(
  title: string,
  options: {
    description?: string;
    action?: { label: string; onClick: () => void };
    tone?: NotificationTone;
  } = {},
) {
  window.dispatchEvent(
    new CustomEvent(notificationEvent, { detail: { title, ...options } }),
  );
}

/**
 * In-app feedback is a short banner at the top of the screen. Reminders and
 * other alerts reach the person as push notifications on their device.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([]);
  const timers = useRef(new Map<string, number>());

  useEffect(() => {
    document.documentElement.classList.toggle(
      "reduce-motion",
      window.localStorage.getItem("flowy:reduce-motion") === "true",
    );
    const active = timers.current;
    return () => active.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const remove = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  // Fades out first, then leaves the list.
  const dismiss = useCallback(
    (id: string) => {
      window.clearTimeout(timers.current.get(id));
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
      );
      timers.current.set(id, window.setTimeout(() => remove(id), EXIT_MS));
    },
    [remove],
  );

  const addNotification = useCallback(
    (notification: NewNotification) => {
      const tone = notification.tone ?? "success";
      const id = crypto.randomUUID();
      const timeout = notification.action ? 6000 : tone === "error" ? 5000 : 2600;
      setItems((current) => {
        // The same message again only restarts the visible one's timer.
        const same = current.find(
          (item) =>
            !item.leaving &&
            item.title === notification.title &&
            item.description === notification.description,
        );
        if (same) {
          window.clearTimeout(timers.current.get(same.id));
          timers.current.set(same.id, window.setTimeout(() => dismiss(same.id), timeout));
          return current;
        }
        const replaced = current.filter((item) => !item.leaving).slice(VISIBLE - 1);
        replaced.forEach((item) => window.clearTimeout(timers.current.get(item.id)));
        timers.current.set(id, window.setTimeout(() => dismiss(id), timeout));
        return [
          { ...notification, tone, id },
          ...current.filter((item) => !replaced.includes(item)).slice(0, VISIBLE - 1),
        ];
      });
    },
    [dismiss],
  );

  useEffect(() => {
    const addFromEvent = (event: Event) =>
      addNotification((event as CustomEvent<NewNotification>).detail);
    window.addEventListener(notificationEvent, addFromEvent);
    return () => window.removeEventListener(notificationEvent, addFromEvent);
  }, [addNotification]);

  const value = useMemo(() => ({ addNotification }), [addNotification]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[300] flex flex-col items-center gap-2 px-3"
        aria-live="polite"
        role="status"
      >
        {items.map((item) => {
          const tone = item.tone ?? "success";
          // Confirmations are a title only; errors keep the explanation.
          const description = tone === "error" ? item.description : undefined;
          return (
            <div
              key={item.id}
              className={cn(
                "flowy-toast pointer-events-auto flex max-w-[min(100%,26rem)] items-center gap-2.5 flowy-glass flowy-glass-strong rounded-full border py-1.5 pl-1.5 pr-1.5 text-card-foreground shadow-soft",
                description && "rounded-2xl",
                item.leaving && "flowy-toast-leave",
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full",
                  tone === "error"
                    ? "bg-destructive/15 text-destructive"
                    : "flowy-active",
                )}
              >
                {TONE_ICON[tone]}
              </span>
              <div className="min-w-0 flex-1 pr-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
                ) : null}
              </div>
              {item.action ? (
                <button
                  type="button"
                  onClick={() => {
                    item.action?.onClick();
                    dismiss(item.id);
                  }}
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold flowy-ink transition-colors hover:bg-primary/10"
                >
                  {item.action.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Fechar aviso"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
