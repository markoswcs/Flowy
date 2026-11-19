import {
  CalendarDays,
  Dumbbell,
  GraduationCap,
  Home,
  Network,
  NotebookPen,
  PenTool,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { SECTION_HREF } from "@/features/notes/note-sections";

export interface DockPlace {
  pathname: string;
  /** Notes section (?tipo=), when on /app/notes. */
  section: string | null;
  view: string | null;
}

export interface DockItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  active: (place: DockPlace) => boolean;
}

/** Everything that can sit in the bottom bar on phones. */
export const DOCK_ITEMS: DockItem[] = [
  { key: "inicio", label: "Início", href: "/app", icon: Home, active: (p) => p.pathname === "/app" && p.view !== "calendar" },
  { key: "notas", label: "Notas", href: SECTION_HREF.nota, icon: NotebookPen, active: (p) => p.pathname === "/app/notes" && p.section === "nota" },
  { key: "mapas", label: "Mapas", href: SECTION_HREF.mapa, icon: Network, active: (p) => p.pathname === "/app/notes" && p.section === "mapa" },
  { key: "desenhos", label: "Desenhos", href: SECTION_HREF.desenho, icon: PenTool, active: (p) => p.pathname === "/app/notes" && p.section === "desenho" },
  { key: "treinos", label: "Treinos", href: "/app/workouts", icon: Dumbbell, active: (p) => p.pathname.startsWith("/app/workouts") },
  { key: "aulas", label: "Grade de aulas", href: "/app/classes", icon: GraduationCap, active: (p) => p.pathname.startsWith("/app/classes") },
  { key: "calendario", label: "Calendário", href: "/app?view=calendar", icon: CalendarDays, active: (p) => p.pathname === "/app" && p.view === "calendar" },
  { key: "config", label: "Configurações", href: "/app/settings", icon: Settings, active: (p) => p.pathname.startsWith("/app/settings") },
];

export const DOCK_SLOTS = 4;
export const DEFAULT_DOCK = ["inicio", "notas", "mapas", "desenhos"];

/**
 * The four shortcuts to show: the saved choice when it is valid (known keys,
 * no repeats), otherwise the default; a missing slot falls back to the default one.
 */
export function resolveDock(saved: unknown): DockItem[] {
  const keys = Array.isArray(saved) ? saved.filter((key): key is string => typeof key === "string") : [];
  const chosen: string[] = [];
  for (let slot = 0; slot < DOCK_SLOTS; slot++) {
    const key = keys[slot];
    const valid = key && DOCK_ITEMS.some((item) => item.key === key) && !chosen.includes(key);
    chosen.push(valid ? key : (DEFAULT_DOCK.find((fallback) => !chosen.includes(fallback) && !keys.includes(fallback)) ?? DEFAULT_DOCK[slot]!));
  }
  return chosen.map((key) => DOCK_ITEMS.find((item) => item.key === key)!);
}

/** Puts `key` in `slot`; if it was already elsewhere, the two swap. */
export function placeInDock(current: string[], slot: number, key: string): string[] {
  const next = [...current];
  const from = next.indexOf(key);
  if (from >= 0) next[from] = next[slot]!;
  next[slot] = key;
  return next;
}
