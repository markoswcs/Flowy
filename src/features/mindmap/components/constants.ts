import type {
  BranchStyle,
  LayoutKind,
  TopicFontSize,
  TopicShape,
} from "@/features/mindmap/types";

export const FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 1.2;

export const SAVE_DELAY = 800;
export const LONG_PRESS_MS = 420;
export const DRAG_THRESHOLD_MOUSE = 4;
export const DRAG_THRESHOLD_TOUCH = 10;

export const NEW_TOPIC_TEXT = "Tópico";
export const NEW_CHILD_TEXT = "Subtópico";
export const FLOATING_TOPIC_TEXT = "Tópico flutuante";

/** Query param carrying the template chosen when the note was created. */
export const TEMPLATE_PARAM = "modelo";

export const TIP_STORAGE_KEY = "flowy-map-tip-dismissed-v2";

export const LAYOUT_OPTIONS: { id: LayoutKind; label: string }[] = [
  { id: "mindmap", label: "Mapa mental" },
  { id: "logic-right", label: "Lógico à direita" },
  { id: "logic-left", label: "Lógico à esquerda" },
  { id: "org", label: "Organograma" },
  { id: "tree", label: "Árvore" },
  { id: "timeline", label: "Linha do tempo" },
];

/** Old maps may still use the retired flowchart layout; offer it only to them. */
export function layoutOptionsFor(current: LayoutKind) {
  return current === "flow"
    ? [...LAYOUT_OPTIONS, { id: "flow" as const, label: "Fluxograma" }]
    : LAYOUT_OPTIONS;
}

export const SHAPE_OPTIONS: { id: TopicShape; label: string }[] = [
  { id: "rounded", label: "Arredondado" },
  { id: "rect", label: "Retângulo" },
  { id: "pill", label: "Pílula" },
  { id: "ellipse", label: "Elipse" },
  { id: "diamond", label: "Losango" },
  { id: "underline", label: "Sublinhado" },
];

export const TOPIC_ICONS = [
  "✅",
  "⭐",
  "🔥",
  "💡",
  "❓",
  "⚠️",
  "📌",
  "🎯",
  "📅",
  "💰",
  "👤",
  "📎",
  "1️⃣",
  "2️⃣",
  "3️⃣",
  "🚀",
  "❤️",
  "👍",
  "👎",
  "⏳",
  "🔒",
  "📈",
  "🧠",
  "🏁",
  "🚩",
  "✏️",
  "📝",
  "🔍",
  "🧩",
  "⚙️",
  "🔗",
  "📊",
  "💬",
  "🎉",
  "😀",
  "😐",
  "😟",
  "❌",
  "⛔",
  "➡️",
  "🔴",
  "🟠",
  "🟡",
  "🟢",
  "🔵",
  "🟣",
  "⚫",
  "🏆",
];

export const BRANCH_STYLE_OPTIONS: { id: BranchStyle; label: string }[] = [
  { id: "curve", label: "Curva" },
  { id: "straight", label: "Reta" },
  { id: "elbow", label: "Cotovelo" },
];

export const FONT_SIZE_OPTIONS: {
  id: TopicFontSize;
  label: string;
  short: string;
}[] = [
  { id: "sm", label: "Pequeno", short: "P" },
  { id: "md", label: "Médio", short: "M" },
  { id: "lg", label: "Grande", short: "G" },
  { id: "xl", label: "Muito grande", short: "GG" },
];

/** Longest side of a topic picture, in map units. */
export const TOPIC_IMAGE_MAX = 200;

export function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}
