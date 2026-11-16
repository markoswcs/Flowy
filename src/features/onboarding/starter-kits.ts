import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Flame,
  GraduationCap,
  HeartPulse,
  Hourglass,
  House,
  Lightbulb,
  Rocket,
  ShoppingCart,
  Sparkles,
  Sprout,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { normalize } from "@/features/tasks/smart-organize";

export interface StarterItem {
  name: string;
  color: string;
  /** Short example of what goes in it, shown on the picker. */
  hint: string;
  icon: LucideIcon;
}

// Names match the smart-organize vocabulary, so "Reunião com cliente" lands in
// Trabalho and "pagar boleto" gets Finanças without any setup.
export const STARTER_FOLDERS: StarterItem[] = [
  { name: "Trabalho", color: "#6366F1", hint: "Reuniões, clientes, entregas", icon: Briefcase },
  { name: "Pessoal", color: "#EC4899", hint: "Família, casa, compromissos", icon: House },
  { name: "Estudos", color: "#38BDF8", hint: "Aulas, provas, cursos", icon: BookOpen },
  { name: "Saúde", color: "#4ADE80", hint: "Treino, médico, remédios", icon: HeartPulse },
  { name: "Finanças", color: "#FACC15", hint: "Contas, boletos, metas", icon: Wallet },
  { name: "Projetos", color: "#A855F7", hint: "Ideias que viram planos", icon: Rocket },
];

export const STARTER_TAGS: StarterItem[] = [
  { name: "Urgente", color: "#F87171", hint: "Não pode esperar", icon: Flame },
  { name: "Ideias", color: "#C084FC", hint: "Para pensar depois", icon: Lightbulb },
  { name: "Compras", color: "#FB923C", hint: "Lista do mercado e afins", icon: ShoppingCart },
  { name: "Reunião", color: "#22D3EE", hint: "Calls e encontros", icon: CalendarDays },
  { name: "Rápida", color: "#A3E635", hint: "Leva menos de 5 min", icon: Zap },
  { name: "Aguardando", color: "#94A3B8", hint: "Depende de alguém", icon: Hourglass },
];

export interface StarterProfile {
  id: string;
  label: string;
  icon: LucideIcon;
  folders: string[];
  tags: string[];
}

export const DEFAULT_STARTER_PROFILE: StarterProfile = {
  id: "all",
  label: "Um pouco de tudo",
  icon: Sparkles,
  folders: ["Trabalho", "Pessoal", "Estudos"],
  tags: ["Urgente", "Ideias", "Reunião"],
};

// One tap fills a sensible selection; the person can still toggle each item.
export const STARTER_PROFILES: StarterProfile[] = [
  { id: "work", label: "Trabalho", icon: Briefcase, folders: ["Trabalho", "Projetos", "Pessoal"], tags: ["Urgente", "Reunião", "Aguardando"] },
  { id: "study", label: "Estudos", icon: GraduationCap, folders: ["Estudos", "Pessoal", "Projetos"], tags: ["Urgente", "Ideias", "Rápida"] },
  { id: "life", label: "Vida pessoal", icon: Sprout, folders: ["Pessoal", "Saúde", "Finanças"], tags: ["Compras", "Urgente", "Rápida"] },
  DEFAULT_STARTER_PROFILE,
];

/** The picked items that do not exist yet (compared without case or accents). */
export function missingStarterItems(
  picked: string[],
  catalog: StarterItem[],
  existing: { name: string }[],
): StarterItem[] {
  const taken = new Set(existing.map((item) => normalize(item.name)));
  const wanted = new Set(picked.map(normalize));
  return catalog.filter((item) => wanted.has(normalize(item.name)) && !taken.has(normalize(item.name)));
}
