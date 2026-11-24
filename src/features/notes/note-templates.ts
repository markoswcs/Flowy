import type { JSONContent } from "@tiptap/core";
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  PenLine,
  Rocket,
  type LucideIcon,
} from "lucide-react";

const text = (value: string): JSONContent => ({ type: "text", text: value });
const heading = (value: string): JSONContent => ({
  type: "heading",
  attrs: { level: 2 },
  content: [text(value)],
});
const paragraph = (value?: string): JSONContent =>
  value ? { type: "paragraph", content: [text(value)] } : { type: "paragraph" };
const bullets = (count: number): JSONContent => ({
  type: "bulletList",
  content: Array.from({ length: count }, () => ({
    type: "listItem",
    content: [paragraph()],
  })),
});
const checklist = (items: string[]): JSONContent => ({
  type: "taskList",
  content: items.map((item) => ({
    type: "taskItem",
    attrs: { checked: false },
    content: [paragraph(item || undefined)],
  })),
});

export interface NoteTemplate {
  id: string;
  label: string;
  hint: string;
  title: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile. */
  tone: string;
  content?: JSONContent;
}

/** Ready-made starts for a note, so a blank page is never the only choice. */
export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    label: "Em branco",
    hint: "Comece do zero",
    title: "",
    icon: PenLine,
    tone: "bg-zinc-500/20 text-zinc-200",
  },
  {
    id: "checklist",
    label: "Lista",
    hint: "Itens para marcar",
    title: "Lista",
    icon: CheckSquare,
    tone: "bg-emerald-500/20 text-emerald-300",
    content: { type: "doc", content: [checklist(["", "", ""])] },
  },
  {
    id: "meeting",
    label: "Reunião",
    hint: "Pauta, decisões e próximos passos",
    title: "Reunião",
    icon: CalendarDays,
    tone: "bg-sky-500/20 text-sky-300",
    content: {
      type: "doc",
      content: [
        heading("Pauta"),
        bullets(2),
        heading("Decisões"),
        bullets(1),
        heading("Próximos passos"),
        checklist(["", ""]),
      ],
    },
  },
  {
    id: "journal",
    label: "Diário",
    hint: "Como foi o dia",
    title: "Diário",
    icon: BookOpen,
    tone: "bg-amber-500/20 text-amber-300",
    content: {
      type: "doc",
      content: [
        heading("Como foi hoje"),
        paragraph(),
        heading("Sou grato por"),
        bullets(3),
        heading("Amanhã eu quero"),
        checklist([""]),
      ],
    },
  },
  {
    id: "project",
    label: "Projeto",
    hint: "Objetivo, etapas e ideias",
    title: "Projeto",
    icon: Rocket,
    tone: "bg-violet-500/20 text-violet-300",
    content: {
      type: "doc",
      content: [
        heading("Objetivo"),
        paragraph(),
        heading("Etapas"),
        checklist(["", "", ""]),
        heading("Ideias e referências"),
        bullets(2),
      ],
    },
  },
  {
    id: "study",
    label: "Estudo",
    hint: "Resumo, dúvidas e revisão",
    title: "Resumo",
    icon: GraduationCap,
    tone: "bg-pink-500/20 text-pink-300",
    content: {
      type: "doc",
      content: [
        heading("Tema"),
        paragraph(),
        heading("Pontos principais"),
        bullets(3),
        heading("Dúvidas"),
        bullets(1),
        heading("Revisar"),
        checklist([""]),
      ],
    },
  },
];
