"use client";

import { Bell, CheckCheck, Info, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Notification = { id: string; title: string; description?: string; createdAt: number; read: boolean; action?: { label: string; onClick: () => void } };
type NotificationsContextValue = { addNotification: (notification: Omit<Notification, "id" | "createdAt" | "read">) => void };
const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const storageKey = "flowy:notifications";
const notificationEvent = "flowy:add-notification";

export function notify(
  title: string,
  options: { description?: string; action?: { label: string; onClick: () => void } } = {},
) {
  window.dispatchEvent(new CustomEvent(notificationEvent, { detail: { title, ...options } }));
}

function formatTime(value: number) { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(value); }

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return [];
    try { return JSON.parse(stored) as Notification[]; } catch { window.localStorage.removeItem(storageKey); return []; }
  });
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(items)); }, [items]);
  useEffect(() => { const close = (event: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false); }; if (open) window.addEventListener("mousedown", close); return () => window.removeEventListener("mousedown", close); }, [open]);
  const addNotification = useCallback((notification: Omit<Notification, "id" | "createdAt" | "read">) => { setItems((current) => [{ ...notification, id: crypto.randomUUID(), createdAt: Date.now(), read: false }, ...current].slice(0, 50)); }, []);
  useEffect(() => {
    const addFromEvent = (event: Event) => addNotification((event as CustomEvent<Omit<Notification, "id" | "createdAt" | "read">>).detail);
    window.addEventListener(notificationEvent, addFromEvent);
    return () => window.removeEventListener(notificationEvent, addFromEvent);
  }, [addNotification]);
  const unreadCount = items.filter((item) => !item.read).length;
  const value = useMemo(() => ({ addNotification }), [addNotification]);
  const pathname = usePathname();
  return <NotificationsContext.Provider value={value}>{children}{pathname.startsWith("/app") ? <div ref={panelRef} className="fixed right-4 top-4 z-[70] sm:right-6 sm:top-6"><Button type="button" variant="outline" size="icon" onClick={() => setOpen((value) => !value)} className="relative rounded-2xl border-border/50 bg-card/80 shadow-soft backdrop-blur-xl" aria-label="Abrir notificações" aria-expanded={open}><Bell className={cn("size-4", unreadCount && "animate-[flowy-bell_1s_ease-in-out]")} />{unreadCount ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}</Button>{open ? <section className="absolute right-0 mt-3 w-[min( calc(100vw-2rem),380px)] overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200" aria-label="Notificações"><div className="flex items-center justify-between border-b border-border/50 px-4 py-3"><div><p className="font-semibold">Notificações</p><p className="text-xs text-muted-foreground">Atualizações do seu espaço</p></div><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => setItems((current) => current.map((item) => ({ ...item, read: true })))} disabled={!unreadCount} aria-label="Marcar todas como vistas"><CheckCheck className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="size-8 hover:text-destructive" onClick={() => setItems([])} disabled={!items.length} aria-label="Limpar notificações"><Trash2 className="size-4" /></Button></div></div><div className="max-h-[min(60vh,480px)] overflow-y-auto p-2">{items.length ? items.map((item) => <div key={item.id} className={cn("mb-1 rounded-2xl p-3 transition-colors", item.read ? "bg-transparent" : "bg-primary/10")}><div className="flex gap-3"><span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><Info className="size-3.5" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium">{item.title}</p><time className="shrink-0 text-[11px] text-muted-foreground">{formatTime(item.createdAt)}</time></div>{item.description ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p> : null}{item.action ? <button type="button" className="mt-2 text-xs font-semibold text-primary hover:underline" onClick={() => { item.action?.onClick(); setItems((current) => current.map((currentItem) => currentItem.id === item.id ? { ...currentItem, read: true } : currentItem)); }}>{item.action.label}</button> : null}</div></div></div>) : <div className="px-5 py-10 text-center"><Bell className="mx-auto mb-3 size-7 text-muted-foreground/50" /><p className="text-sm font-medium">Tudo em dia</p><p className="mt-1 text-xs text-muted-foreground">As próximas atualizações aparecerão aqui.</p></div>}</div></section> : null}</div> : null}</NotificationsContext.Provider>;
}

export function useNotifications() { const context = useContext(NotificationsContext); if (!context) throw new Error("useNotifications must be used within NotificationProvider"); return context; }
