import { flatten } from "@/features/mindmap/model";
import { THEMES } from "@/features/mindmap/themes";
import type {
  LayoutResult,
  MapDoc,
  PlacedTopic,
  Topic,
} from "@/features/mindmap/types";
import {
  topicAppearance,
  type TopicAppearance,
} from "@/features/mindmap/components/appearance";
import { FONT_STACK } from "@/features/mindmap/components/constants";
import {
  measureTopicBox,
  type TopicBox,
} from "@/features/mindmap/components/measure";
import { relationGeometry } from "@/features/mindmap/components/relation-geometry";
import { floatingTopicIds } from "@/features/mindmap/components/tree-ops";

const PADDING = 48;
const PRIORITY_COLORS = ["", "#DC2626", "#EA580C", "#2563EB"];

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function shapeSvg(p: PlacedTopic, look: TopicAppearance): string {
  const { x, y, width: w, height: h } = p;
  const stroke = look.border === "transparent" ? "none" : look.border;
  const attrs = `fill="${look.fill === "transparent" ? "none" : look.fill}" stroke="${stroke}" stroke-width="1.2"`;
  switch (look.shape) {
    case "diamond":
      return `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" ${attrs}/>`;
    case "ellipse":
      return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${attrs}/>`;
    case "underline":
      return `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${look.border}" stroke-width="2.5"/>`;
    case "none":
      return "";
    default: {
      const radius =
        look.shape === "pill" ? h / 2 : look.shape === "rect" ? 2 : 10;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ${attrs}/>`;
    }
  }
}

function badgesSvg(
  topic: Topic,
  box: TopicBox,
  look: TopicAppearance,
  startX: number,
  centerY: number,
): string {
  let x = startX;
  const parts: string[] = [];
  if (topic.done !== undefined) {
    parts.push(
      `<rect x="${x}" y="${centerY - 8}" width="16" height="16" rx="4" fill="${topic.done ? look.color : "none"}" stroke="${look.color}" stroke-width="2"/>`,
    );
    x += 24;
  }
  if (topic.priority) {
    parts.push(
      `<circle cx="${x + 9}" cy="${centerY}" r="9" fill="${PRIORITY_COLORS[topic.priority]}"/><text x="${x + 9}" y="${centerY + 4}" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">${topic.priority}</text>`,
    );
    x += 24;
  }
  if (topic.icon) {
    parts.push(
      `<text x="${x}" y="${centerY + box.metrics.fontSize * 0.35}" font-size="${box.metrics.fontSize}">${escapeXml(topic.icon)}</text>`,
    );
  }
  return parts.join("");
}

function topicSvg(
  topic: Topic,
  p: PlacedTopic,
  box: TopicBox,
  look: TopicAppearance,
): string {
  const { metrics } = box;
  const contentWidth = box.leading + box.textWidth + box.trailing;
  const startX = p.x + (p.width - contentWidth) / 2;
  const centerY = p.y + p.height / 2;
  const textX = startX + box.leading + box.textWidth / 2;
  const firstBaseline =
    centerY -
    ((box.lines.length - 1) * metrics.lineHeight) / 2 +
    metrics.fontSize * 0.35;
  const lines = box.lines
    .map(
      (line, i) =>
        `<tspan x="${textX}" y="${firstBaseline + i * metrics.lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const decoration = topic.done ? ' text-decoration="line-through"' : "";
  return [
    shapeSvg(p, look),
    badgesSvg(topic, box, look, startX, centerY),
    `<text font-size="${metrics.fontSize}" font-weight="${metrics.fontWeight}" fill="${look.color}" text-anchor="middle"${decoration}>${lines}</text>`,
  ].join("");
}

/** Standalone SVG drawn from the layout result (no foreignObject, so it rasterizes everywhere). */
export function buildMapSvg(
  doc: MapDoc,
  layout: LayoutResult,
  dark: boolean,
): { svg: string; width: number; height: number } {
  const theme = THEMES[doc.theme] ?? THEMES.flowy;
  const background = dark ? theme.canvas.dark : theme.canvas.light;
  const relationColor = dark ? "#CBD5E1" : "#475569";
  const { bounds } = layout;
  const width = Math.ceil(bounds.width + PADDING * 2);
  const height = Math.ceil(bounds.height + PADDING * 2);
  const topics = new Map(flatten(doc).map((t) => [t.id, t]));
  const floating = floatingTopicIds(doc);

  const connectors = layout.connectors
    .map(
      (c) =>
        `<path d="${c.path}" stroke="${c.color}" stroke-width="${c.width}" fill="none" stroke-linecap="round"/>`,
    )
    .join("");
  const relations = doc.relations
    .map((relation) => {
      const from = layout.topics.get(relation.from);
      const to = layout.topics.get(relation.to);
      if (!from || !to) return "";
      const g = relationGeometry(relation, from, to, doc.layout);
      const dash = g.dashed ? ' stroke-dasharray="6 5"' : "";
      const label = relation.label
        ? `<text x="${g.labelX}" y="${g.labelY - 6}" font-size="12" font-weight="600" fill="${relationColor}" text-anchor="middle" stroke="${background}" stroke-width="4" paint-order="stroke">${escapeXml(relation.label)}</text>`
        : "";
      return `<path d="${g.path}" stroke="${relationColor}" stroke-width="1.75" fill="none"${dash} marker-end="url(#arrow)"/>${label}`;
    })
    .join("");
  const nodes = Array.from(layout.topics.values())
    .map((p) => {
      const topic = topics.get(p.id);
      if (!topic) return "";
      const depth = p.depth + (floating.has(p.id) ? 1 : 0);
      const box = measureTopicBox(topic, depth, doc.layout);
      const look = topicAppearance(
        topic,
        depth,
        p.branchColor,
        theme,
        doc.layout,
        dark,
      );
      return topicSvg(topic, p, box, look);
    })
    .join("");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${bounds.x - PADDING} ${bounds.y - PADDING} ${width} ${height}" font-family='${FONT_STACK}'>`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${relationColor}"/></marker></defs>`,
    `<rect x="${bounds.x - PADDING}" y="${bounds.y - PADDING}" width="${width}" height="${height}" fill="${background}"/>`,
    connectors,
    relations,
    nodes,
    "</svg>",
  ].join("");
  return { svg, width, height };
}

export async function svgToPngBlob(
  svg: string,
  width: number,
  height: number,
): Promise<Blob> {
  const maxSide = 8000;
  const scale = Math.min(2, maxSide / Math.max(width, height));
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível");
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Falha ao gerar PNG")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(title: string): string {
  const clean = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .slice(0, 80);
  return clean || "mapa";
}
