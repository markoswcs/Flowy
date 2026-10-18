import type {
  LayoutKind,
  Size,
  Topic,
  TopicFontSize,
  TopicShape,
} from "@/features/mindmap/types";
import { FONT_STACK } from "@/features/mindmap/components/constants";

/**
 * Topic sizes come from canvas text metrics instead of the DOM, so layout can
 * run synchronously during render. The DOM then renders exactly these lines
 * (white-space: pre), which keeps boxes and text in agreement.
 */

export interface TopicMetrics {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  padX: number;
  padY: number;
  maxTextWidth: number;
  italic: boolean;
}

export interface TopicBox extends Size {
  lines: string[];
  textWidth: number;
  metrics: TopicMetrics;
  /** Width taken by badges (checkbox, priority, icon, note, link). */
  leading: number;
  trailing: number;
  /** Width of each label chip, in order. */
  labelWidths: number[];
  /** Short due date ("12 out") or null. */
  dueLabel: string | null;
  dueWidth: number;
  /** Height reserved above the text for the topic image (0 = none). */
  imageHeight: number;
}

export const LABEL_FONT = `600 11px ${FONT_STACK}`;
export const LABEL_HEIGHT = 18;
export const LABEL_GAP = 4;
export const IMAGE_GAP = 6;
const DUE_FONT = `600 11px ${FONT_STACK}`;
const SIZE_SCALE: Record<TopicFontSize, number> = {
  sm: 0.85,
  md: 1,
  lg: 1.25,
  xl: 1.6,
};
const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function dueLabel(due: string | undefined): string | null {
  const match = due ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(due) : null;
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month}` : null;
}

const ICON_GAP = 6;
const BADGE_SIZE = 18;
const SMALL_BADGE = 14;
const TEXT_SLACK = 2;
const MAX_CACHE = 6000;

export function topicMetrics(
  depth: number,
  bold: boolean,
  layout: LayoutKind,
  size: TopicFontSize = "md",
  italic = false,
): TopicMetrics {
  const scale = SIZE_SCALE[size] ?? 1;
  const fontSize = Math.round(
    (depth === 0 ? 18 : depth === 1 ? 15 : 14) * scale,
  );
  const baseWeight = depth === 0 ? 700 : depth === 1 ? 600 : 400;
  const flow = layout === "flow";
  return {
    fontSize,
    fontWeight: bold ? 700 : baseWeight,
    lineHeight: Math.round(fontSize * 1.35),
    padX: depth === 0 ? 20 : flow ? 16 : depth === 1 ? 14 : 12,
    padY: depth === 0 ? 12 : flow ? 10 : depth === 1 ? 8 : 6,
    maxTextWidth: Math.round((depth === 0 ? 260 : 220) * Math.max(1, scale)),
    italic,
  };
}

export function fontString(metrics: TopicMetrics): string {
  const style = metrics.italic ? "italic " : "";
  return `${style}${metrics.fontWeight} ${metrics.fontSize}px ${FONT_STACK}`;
}

let context: CanvasRenderingContext2D | null = null;

export function textWidth(text: string, font: string): number {
  if (typeof document === "undefined") return text.length * 8;
  context ??= document.createElement("canvas").getContext("2d");
  if (!context) return text.length * 8;
  context.font = font;
  return context.measureText(text).width;
}

function breakLongWord(word: string, font: string, maxWidth: number): string[] {
  const parts: string[] = [];
  let current = "";
  for (const char of Array.from(word)) {
    if (current && textWidth(current + char, font) > maxWidth) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function wrapParagraph(
  paragraph: string,
  font: string,
  maxWidth: number,
): string[] {
  const words = paragraph
    .split(/ +/)
    .flatMap((word) =>
      textWidth(word, font) > maxWidth
        ? breakLongWord(word, font, maxWidth)
        : [word],
    );
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && textWidth(candidate, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}

export function wrapText(
  text: string,
  font: string,
  maxWidth: number,
): string[] {
  return text
    .split("\n")
    .flatMap((paragraph) => wrapParagraph(paragraph, font, maxWidth));
}

function badgeWidths(topic: Topic, fontSize: number) {
  let leading = 0;
  if (topic.done !== undefined) leading += BADGE_SIZE + ICON_GAP;
  if (topic.progress !== undefined) leading += BADGE_SIZE + ICON_GAP;
  if (topic.priority) leading += BADGE_SIZE + ICON_GAP;
  if (topic.icon) leading += fontSize + 4 + ICON_GAP;
  let trailing = 0;
  if (topic.note) trailing += SMALL_BADGE + ICON_GAP;
  if (topic.link) trailing += SMALL_BADGE + ICON_GAP;
  return { leading, trailing };
}

function shapeSize(shape: TopicShape, width: number, height: number): Size {
  if (shape === "ellipse")
    return {
      width: Math.round(width * 1.22 + 8),
      height: Math.round(height * 1.4),
    };
  if (shape === "diamond")
    return {
      width: Math.round(width * 1.6 + 8),
      height: Math.round(height * 1.9),
    };
  return { width, height };
}

/**
 * XMind's default look: a filled central topic, filled main branches and
 * subtopics drawn as text on their branch line (no box) in radial, logic and
 * tree maps. Org charts and timelines keep boxes so they stay readable.
 */
export function defaultShape(depth: number, layout: LayoutKind): TopicShape {
  if (layout === "flow") return depth === 0 ? "pill" : "rect";
  const lined =
    layout === "mindmap" ||
    layout === "logic-right" ||
    layout === "logic-left" ||
    layout === "tree";
  return lined && depth >= 2 ? "underline" : "rounded";
}

export function resolveShape(
  topic: Topic,
  depth: number,
  layout: LayoutKind,
): TopicShape {
  return topic.style?.shape ?? defaultShape(depth, layout);
}

function computeBox(topic: Topic, depth: number, layout: LayoutKind): TopicBox {
  const metrics = topicMetrics(
    depth,
    Boolean(topic.style?.bold),
    layout,
    topic.style?.size,
    Boolean(topic.style?.italic),
  );
  const font = fontString(metrics);
  const lines = wrapText(topic.text || " ", font, metrics.maxTextWidth);
  const measured = Math.max(
    ...lines.map((line) => textWidth(line, font)),
    metrics.fontSize,
  );
  const textW = Math.ceil(measured) + TEXT_SLACK;
  const badges = badgeWidths(topic, metrics.fontSize);
  const due = dueLabel(topic.due);
  const dueWidth = due ? Math.ceil(textWidth(due, DUE_FONT)) + 12 : 0;
  const leading = badges.leading;
  const trailing = badges.trailing + (due ? dueWidth + ICON_GAP : 0);
  const labelWidths = (topic.labels ?? []).map(
    (label) => Math.ceil(textWidth(label, LABEL_FONT)) + 14,
  );
  const labelsRow = labelWidths.length
    ? labelWidths.reduce((sum, w) => sum + w, 0) +
      LABEL_GAP * (labelWidths.length - 1)
    : 0;
  const imageHeight = topic.image ? topic.image.height + IMAGE_GAP : 0;
  const contentHeight =
    Math.max(lines.length * metrics.lineHeight, BADGE_SIZE) +
    imageHeight +
    (labelWidths.length ? LABEL_HEIGHT + LABEL_GAP : 0);
  const minWidth = depth === 0 ? 96 : 48;
  const base = {
    width: Math.max(
      minWidth,
      Math.max(textW + leading + trailing, labelsRow, topic.image?.width ?? 0) +
        metrics.padX * 2,
    ),
    height: contentHeight + metrics.padY * 2,
  };
  const size = shapeSize(
    resolveShape(topic, depth, layout),
    base.width,
    base.height,
  );
  return {
    ...size,
    lines,
    textWidth: textW,
    metrics,
    leading,
    trailing,
    labelWidths,
    dueLabel: due,
    dueWidth,
    imageHeight,
  };
}

const cache = new Map<string, TopicBox>();

function cacheKey(topic: Topic, depth: number, layout: LayoutKind): string {
  const style = topic.style;
  return [
    topic.text,
    Math.min(depth, 2),
    layout === "flow" ? "f" : "m",
    style?.shape ?? "",
    style?.bold ? 1 : 0,
    topic.icon ?? "",
    topic.priority ?? 0,
    topic.done === undefined ? "" : "t",
    topic.note ? "n" : "",
    topic.link ? "l" : "",
    style?.size ?? "",
    style?.italic ? "i" : "",
    topic.progress ?? "",
    topic.due ?? "",
    topic.labels?.join(",") ?? "",
    topic.image ? `${topic.image.width}x${topic.image.height}` : "",
  ].join("|");
}

export function measureTopicBox(
  topic: Topic,
  depth: number,
  layout: LayoutKind,
): TopicBox {
  const key = cacheKey(topic, depth, layout);
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > MAX_CACHE) cache.clear();
  const box = computeBox(topic, depth, layout);
  cache.set(key, box);
  return box;
}
