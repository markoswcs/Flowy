import {
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardCopy,
  Copy,
  Crosshair,
  FileCode2,
  FileImage,
  FileText,
  GitBranchPlus,
  GitFork,
  LayoutTemplate,
  LayoutGrid,
  ListPlus,
  Maximize,
  PaintBucket,
  PencilLine,
  Redo2,
  Spline,
  StickyNote,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";

export type ToolId =
  | "undo"
  | "redo"
  | "child"
  | "sibling"
  | "parent"
  | "duplicate"
  | "delete"
  | "edit"
  | "format"
  | "note"
  | "collapse-all"
  | "auto-arrange"
  | "expand-all"
  | "link"
  | "template"
  | "fit"
  | "center"
  | "zoom-in"
  | "zoom-out"
  | "export-png"
  | "export-svg"
  | "export-md"
  | "copy-outline"
  | "trash";

export interface ToolDef {
  label: string;
  short?: string;
  shortcut?: string;
  icon: LucideIcon;
  needsTopic?: boolean;
  danger?: boolean;
}

export const TOOLS: Record<ToolId, ToolDef> = {
  undo: { label: "Desfazer", shortcut: "Ctrl+Z", icon: Undo2 },
  redo: { label: "Refazer", shortcut: "Ctrl+Shift+Z", icon: Redo2 },
  child: {
    label: "Adicionar subtópico",
    short: "Subtópico",
    shortcut: "Tab",
    icon: GitBranchPlus,
    needsTopic: true,
  },
  sibling: {
    label: "Adicionar tópico irmão",
    short: "Irmão",
    shortcut: "Enter",
    icon: ListPlus,
    needsTopic: true,
  },
  parent: {
    label: "Adicionar tópico pai",
    short: "Pai",
    shortcut: "Shift+Tab",
    icon: GitFork,
    needsTopic: true,
  },
  duplicate: {
    label: "Duplicar",
    shortcut: "Ctrl+D",
    icon: Copy,
    needsTopic: true,
  },
  delete: {
    label: "Excluir tópico",
    short: "Excluir",
    shortcut: "Delete",
    icon: Trash2,
    needsTopic: true,
    danger: true,
  },
  edit: {
    label: "Editar texto",
    short: "Editar",
    shortcut: "F2",
    icon: PencilLine,
    needsTopic: true,
  },
  format: { label: "Formatar", icon: PaintBucket },
  note: {
    label: "Nota do tópico",
    short: "Nota",
    icon: StickyNote,
    needsTopic: true,
  },
  "collapse-all": {
    label: "Recolher tudo",
    short: "Recolher",
    icon: ChevronsDownUp,
  },
  "auto-arrange": {
    label: "Reorganizar automaticamente",
    short: "Reorganizar",
    icon: LayoutGrid,
  },
  "expand-all": {
    label: "Expandir tudo",
    short: "Expandir",
    icon: ChevronsUpDown,
  },
  link: { label: "Ligar tópicos", short: "Ligar", icon: Spline },
  template: {
    label: "Novo a partir de modelo",
    short: "Modelo",
    icon: LayoutTemplate,
  },
  fit: { label: "Ajustar à tela", short: "Ajustar", icon: Maximize },
  center: { label: "Centralizar", icon: Crosshair },
  "zoom-in": { label: "Aumentar zoom", short: "Zoom +", icon: ZoomIn },
  "zoom-out": { label: "Diminuir zoom", short: "Zoom −", icon: ZoomOut },
  "export-png": { label: "Exportar PNG", short: "PNG", icon: FileImage },
  "export-svg": { label: "Exportar SVG", short: "SVG", icon: FileCode2 },
  "export-md": {
    label: "Exportar Markdown",
    short: "Markdown",
    icon: FileText,
  },
  "copy-outline": {
    label: "Copiar como tópicos",
    short: "Copiar texto",
    icon: ClipboardCopy,
  },
  trash: {
    label: "Mover para a lixeira",
    short: "Lixeira",
    icon: Trash2,
    danger: true,
  },
};

export const EXPORT_TOOLS: ToolId[] = [
  "export-png",
  "export-svg",
  "export-md",
  "copy-outline",
];

export interface ToolState {
  canUndo: boolean;
  canRedo: boolean;
  hasTopic: boolean;
  linking: boolean;
  formatOpen: boolean;
}

export function isToolDisabled(id: ToolId, state: ToolState): boolean {
  if (id === "undo") return !state.canUndo;
  if (id === "redo") return !state.canRedo;
  return Boolean(TOOLS[id].needsTopic) && !state.hasTopic;
}

export function isToolActive(id: ToolId, state: ToolState): boolean {
  return (
    (id === "link" && state.linking) || (id === "format" && state.formatOpen)
  );
}
