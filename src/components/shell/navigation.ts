import {
  Dumbbell,
  Home,
  Network,
  NotebookPen,
  PenTool,
  Settings,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { SECTION_HREF } from "@/features/notes/note-sections";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const mainNavigation: NavigationItem[] = [
  { label: "Início", href: "/app", icon: Home },
  { label: "Foco", href: "/app/focus", icon: Target },
  { label: "Notas", href: SECTION_HREF.nota, icon: NotebookPen },
  { label: "Mapas", href: SECTION_HREF.mapa, icon: Network },
  { label: "Desenhos", href: SECTION_HREF.desenho, icon: PenTool },
];

/** Optional modules, listed only for people who turned them on. */
export const workoutsNavigation: NavigationItem = { label: "Treinos", href: "/app/workouts", icon: Dumbbell };

export const secondaryNavigation: NavigationItem[] = [
  { label: "Lixeira", href: "/app/trash", icon: Trash2 },
  { label: "Configurações", href: "/app/settings", icon: Settings },
];
