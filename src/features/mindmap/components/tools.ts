import {
  Braces,
  Expand,
  FileArchive,
  FileType,
  FileUp,
  Focus,
  Keyboard,
  Layers,
  ListTree,
  PaintRoller,
  Paintbrush,
  Presentation,
  Search,
  SquareDashed,
  SquareDashedMousePointer,
  SquarePlus,
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
  | "trash"
  | "search"
  | "outline"
  | "focus"
  | "present"
  | "boundary"
  | "floating"
  | "select-all"
  | "copy-style"
  | "paste-style"
  | "fullscreen"
  | "shortcuts"
  | "import"
  | "export-xmind"
  | "export-mm"
  | "export-opml"
  | "export-json"
  | "export-txt"
  | "expand-1"
  | "expand-2"
  | "expand-3";

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
  },
  sibling: {
    label: "Adicionar tópico no mesmo nível",
    short: "Tópico",
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
  search: {
    label: "Buscar no mapa",
    short: "Buscar",
    shortcut: "Ctrl+F",
    icon: Search,
  },
  outline: {
    label: "Estrutura em tópicos",
    short: "Estrutura",
    shortcut: "Ctrl+Shift+O",
    icon: ListTree,
  },
  focus: {
    label: "Focar no ramo",
    short: "Focar",
    shortcut: "Ctrl+Shift+F",
    icon: Focus,
    needsTopic: true,
  },
  present: {
    label: "Apresentar",
    shortcut: "F5",
    icon: Presentation,
  },
  boundary: {
    label: "Limite em volta do ramo",
    short: "Limite",
    shortcut: "Ctrl+Shift+B",
    icon: SquareDashed,
    needsTopic: true,
  },
  floating: {
    label: "Tópico flutuante",
    short: "Flutuante",
    icon: SquarePlus,
  },
  "select-all": {
    label: "Selecionar tudo",
    short: "Tudo",
    shortcut: "Ctrl+A",
    icon: SquareDashedMousePointer,
  },
  "copy-style": {
    label: "Copiar estilo",
    short: "Copiar estilo",
    shortcut: "Ctrl+Alt+C",
    icon: Paintbrush,
    needsTopic: true,
  },
  "paste-style": {
    label: "Colar estilo",
    short: "Colar estilo",
    shortcut: "Ctrl+Alt+V",
    icon: PaintRoller,
    needsTopic: true,
  },
  fullscreen: { label: "Tela cheia", icon: Expand },
  shortcuts: {
    label: "Atalhos de teclado",
    short: "Atalhos",
    shortcut: "Ctrl+/",
    icon: Keyboard,
  },
  import: {
    label: "Importar (XMind, MindMeister, FreeMind, OPML, Markdown)",
    short: "Importar",
    icon: FileUp,
  },
  "export-xmind": {
    label: "Exportar XMind (.xmind)",
    short: "XMind",
    icon: FileArchive,
  },
  "export-mm": {
    label: "Exportar FreeMind / MindMeister (.mm)",
    short: "FreeMind",
    icon: FileCode2,
  },
  "export-opml": { label: "Exportar OPML", short: "OPML", icon: ListTree },
  "export-json": {
    label: "Exportar Flowy (.json)",
    short: "JSON",
    icon: Braces,
  },
  "export-txt": {
    label: "Exportar texto com recuo",
    short: "Texto",
    icon: FileType,
  },
  "expand-1": {
    label: "Expandir até o nível 1",
    short: "Nível 1",
    icon: Layers,
  },
  "expand-2": {
    label: "Expandir até o nível 2",
    short: "Nível 2",
    icon: Layers,
  },
  "expand-3": {
    label: "Expandir até o nível 3",
    short: "Nível 3",
    icon: Layers,
  },
};

export const EXPORT_TOOLS: ToolId[] = [
  "export-png",
  "export-svg",
  "export-xmind",
  "export-mm",
  "export-opml",
  "export-md",
  "export-txt",
  "export-json",
  "copy-outline",
];

export const EXPAND_TOOLS: ToolId[] = [
  "collapse-all",
  "expand-1",
  "expand-2",
  "expand-3",
  "expand-all",
];

export interface ToolState {
  canUndo: boolean;
  canRedo: boolean;
  hasTopic: boolean;
  linking: boolean;
  formatOpen: boolean;
  outlineOpen?: boolean;
  searchOpen?: boolean;
  focused?: boolean;
  hasStyleClip?: boolean;
}

export function isToolDisabled(id: ToolId, state: ToolState): boolean {
  if (id === "undo") return !state.canUndo;
  if (id === "redo") return !state.canRedo;
  if (id === "paste-style") return !state.hasTopic || !state.hasStyleClip;
  if (id === "focus" && state.focused) return false;
  return Boolean(TOOLS[id].needsTopic) && !state.hasTopic;
}

export function isToolActive(id: ToolId, state: ToolState): boolean {
  return (
    (id === "link" && state.linking) ||
    (id === "format" && state.formatOpen) ||
    (id === "outline" && Boolean(state.outlineOpen)) ||
    (id === "search" && Boolean(state.searchOpen)) ||
    (id === "focus" && Boolean(state.focused))
  );
}
