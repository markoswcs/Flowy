import {
  Home,
  Network,
  NotebookPen,
  PenTool,
  Settings,
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
  { label: "Notas", href: SECTION_HREF.nota, icon: NotebookPen },
  { label: "Mapas", href: SECTION_HREF.mapa, icon: Network },
  { label: "Desenhos", href: SECTION_HREF.desenho, icon: PenTool },
];

export const secondaryNavigation: NavigationItem[] = [
  { label: "Lixeira", href: "/app/trash", icon: Trash2 },
  { label: "Configurações", href: "/app/settings", icon: Settings },
];
