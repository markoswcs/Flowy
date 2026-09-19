import {
  Home,
  Settings,
  NotebookPen,
  Trash2,
  type LucideIcon,
} from "lucide-react";

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const mainNavigation: NavigationItem[] = [
  { label: "Início", href: "/app", icon: Home },
  { label: "Notas", href: "/app/notes", icon: NotebookPen },
];

export const secondaryNavigation: NavigationItem[] = [
  { label: "Lixeira", href: "/app/trash", icon: Trash2 },
  { label: "Configurações", href: "/app/settings", icon: Settings },
];
