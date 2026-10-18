"use client";

import { Info, X } from "lucide-react";
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

type Notification = {
  id: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
};
type NewNotification = Omit<Notification, "id">;
type NotificationsContextValue = {
  addNotification: (notification: NewNotification) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const notificationEvent = "flowy:add-notification";
const VISIBLE = 2;

export function notify(
  title: string,
  options: { description?: string; action?: { label: string; onClick: () => void } } = {},
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

  const dismiss = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: NewNotification) => {
      const id = crypto.randomUUID();
      setItems((current) => [{ ...notification, id }, ...current].slice(0, VISIBLE));
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), notification.action ? 6000 : 3200),
      );
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
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-md items-center gap-3 flowy-glass flowy-glass-strong rounded-2xl border py-2.5 pl-3 pr-1.5 text-card-foreground animate-in fade-in slide-in-from-top-3 duration-300"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-xl flowy-active">
              <Info className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              {item.description ? (
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
            {item.action ? (
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick();
                  dismiss(item.id);
                }}
                className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold flowy-ink transition-colors hover:bg-primary/10"
              >
                {item.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Fechar aviso"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
