import { normalize } from "@/features/tasks/smart-organize";

export interface StarterItem {
  name: string;
  color: string;
  /** Short example of what goes in it, shown on the picker. */
  hint: string;
  emoji: string;
}

// Names match the smart-organize vocabulary, so "Reunião com cliente" lands in
// Trabalho and "pagar boleto" gets Finanças without any setup.
export const STARTER_FOLDERS: StarterItem[] = [
  { name: "Trabalho", color: "#6366F1", hint: "Reuniões, clientes, entregas", emoji: "💼" },
  { name: "Pessoal", color: "#EC4899", hint: "Família, casa, compromissos", emoji: "🏡" },
  { name: "Estudos", color: "#38BDF8", hint: "Aulas, provas, cursos", emoji: "📚" },
  { name: "Saúde", color: "#4ADE80", hint: "Treino, médico, remédios", emoji: "💪" },
  { name: "Finanças", color: "#FACC15", hint: "Contas, boletos, metas", emoji: "💰" },
  { name: "Projetos", color: "#A855F7", hint: "Ideias que viram planos", emoji: "🚀" },
];

export const STARTER_TAGS: StarterItem[] = [
  { name: "Urgente", color: "#F87171", hint: "Não pode esperar", emoji: "🔥" },
  { name: "Ideias", color: "#C084FC", hint: "Para pensar depois", emoji: "💡" },
  { name: "Compras", color: "#FB923C", hint: "Lista do mercado e afins", emoji: "🛒" },
  { name: "Reunião", color: "#22D3EE", hint: "Calls e encontros", emoji: "🗓️" },
  { name: "Rápida", color: "#A3E635", hint: "Leva menos de 5 min", emoji: "⚡" },
  { name: "Aguardando", color: "#94A3B8", hint: "Depende de alguém", emoji: "⏳" },
];

export interface StarterProfile {
  id: string;
  label: string;
  emoji: string;
  folders: string[];
  tags: string[];
}

export const DEFAULT_STARTER_PROFILE: StarterProfile = {
  id: "all",
  label: "Um pouco de tudo",
  emoji: "✨",
  folders: ["Trabalho", "Pessoal", "Estudos"],
  tags: ["Urgente", "Ideias", "Reunião"],
};

// One tap fills a sensible selection; the person can still toggle each item.
export const STARTER_PROFILES: StarterProfile[] = [
  { id: "work", label: "Trabalho", emoji: "💼", folders: ["Trabalho", "Projetos", "Pessoal"], tags: ["Urgente", "Reunião", "Aguardando"] },
  { id: "study", label: "Estudos", emoji: "🎓", folders: ["Estudos", "Pessoal", "Projetos"], tags: ["Urgente", "Ideias", "Rápida"] },
  { id: "life", label: "Vida pessoal", emoji: "🌱", folders: ["Pessoal", "Saúde", "Finanças"], tags: ["Compras", "Urgente", "Rápida"] },
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
