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
import { boundaryRects } from "@/features/mindmap/components/boundaries";
import { FONT_STACK } from "@/features/mindmap/components/constants";
import {
  LABEL_GAP,
  LABEL_HEIGHT,
  measureTopicBox,
  type TopicBox,
} from "@/features/mindmap/components/measure";
import {
  isOverdue,
  progressPath,
} from "@/features/mindmap/components/topic-node";
import { relationGeometry } from "@/features/mindmap/components/relation-geometry";
import { floatingTopicIds } from "@/features/mindmap/components/tree-ops";

const PADDING = 48;
const PRIORITY_COLORS = ["", "#DC2626", "#EA580C", "#2563EB"];

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function markerFor(color: string): string {
  return `arrow-${color.replace(/[^a-z0-9]/gi, "")}`;
}

function shapeSvg(p: PlacedTopic, look: TopicAppearance): string {
  const { x, y, width: w, height: h } = p;
  const stroke = look.border === "transparent" ? "none" : look.border;
  const dash = look.dashed ? ` stroke-dasharray="6 4"` : "";
  const attrs = `fill="${look.fill === "transparent" ? "none" : look.fill}" stroke="${stroke}" stroke-width="1.2"${dash}`;
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
  if (topic.progress !== undefined) {
    const v = topic.progress;
    parts.push(
      `<circle cx="${x + 9}" cy="${centerY}" r="8" fill="#fff" stroke="#16A34A" stroke-width="1.5"/>` +
        (v >= 100
          ? `<circle cx="${x + 9}" cy="${centerY}" r="7" fill="#16A34A"/>`
          : v > 0
            ? `<path d="${progressPath(x + 9, centerY, 7, v)}" fill="#16A34A"/>`
            : ""),
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

function labelsSvg(
  topic: Topic,
  box: TopicBox,
  look: TopicAppearance,
  p: PlacedTopic,
  top: number,
): string {
  if (!topic.labels?.length) return "";
  const total =
    box.labelWidths.reduce((sum, w) => sum + w, 0) +
    LABEL_GAP * (box.labelWidths.length - 1);
  let x = p.x + (p.width - total) / 2;
  return topic.labels
    .map((label, i) => {
      const w = box.labelWidths[i] ?? 0;
      const chip = `<rect x="${x}" y="${top}" width="${w}" height="${LABEL_HEIGHT}" rx="${LABEL_HEIGHT / 2}" fill="${look.color}" fill-opacity="0.12"/><text x="${x + w / 2}" y="${top + 12.5}" font-size="11" font-weight="600" fill="${look.color}" text-anchor="middle">${escapeXml(label)}</text>`;
      x += w + LABEL_GAP;
      return chip;
    })
    .join("");
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
  const labelsHeight = topic.labels?.length ? LABEL_HEIGHT + LABEL_GAP : 0;
  const rowHeight = Math.max(box.lines.length * metrics.lineHeight, 18);
  const contentTop =
    p.y + (p.height - (box.imageHeight + rowHeight + labelsHeight)) / 2;
  const centerY = contentTop + box.imageHeight + rowHeight / 2;
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
  const decoration =
    topic.done || topic.style?.strike ? ' text-decoration="line-through"' : "";
  const italic = metrics.italic ? ' font-style="italic"' : "";
  const image = topic.image
    ? `<image href="${escapeXml(topic.image.src)}" x="${p.x + (p.width - topic.image.width) / 2}" y="${contentTop}" width="${topic.image.width}" height="${topic.image.height}"/>`
    : "";
  let due = "";
  if (box.dueLabel) {
    const dueX = startX + contentWidth - box.dueWidth;
    const overdue = isOverdue(topic);
    due = `<rect x="${dueX}" y="${centerY - 9}" width="${box.dueWidth}" height="18" rx="9" fill="${overdue ? "#DC2626" : look.color}" fill-opacity="${overdue ? 1 : 0.12}"/><text x="${dueX + box.dueWidth / 2}" y="${centerY + 4}" font-size="11" font-weight="600" fill="${overdue ? "#fff" : look.color}" text-anchor="middle">${escapeXml(box.dueLabel)}</text>`;
  }
  return [
    shapeSvg(p, look),
    image,
    badgesSvg(topic, box, look, startX, centerY),
    `<text font-size="${metrics.fontSize}" font-weight="${metrics.fontWeight}" fill="${look.color}" text-anchor="middle"${decoration}${italic}>${lines}</text>`,
    due,
    labelsSvg(topic, box, look, p, centerY + rowHeight / 2 + LABEL_GAP),
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
  const boundaries = boundaryRects(doc, layout)
    .map(
      (b) =>
        `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" rx="14" fill="${b.color}" fill-opacity="0.07" stroke="${b.color}" stroke-width="1.5" stroke-dasharray="7 5"/>` +
        (b.label
          ? `<text x="${b.x + 12}" y="${b.y + 15}" font-size="12" font-weight="700" fill="${b.color}">${escapeXml(b.label)}</text>`
          : ""),
    )
    .join("");
  const markerColors = new Set([relationColor]);
  doc.relations.forEach((r) => r.color && markerColors.add(r.color));
  const relations = doc.relations
    .map((relation) => {
      const from = layout.topics.get(relation.from);
      const to = layout.topics.get(relation.to);
      if (!from || !to) return "";
      const g = relationGeometry(relation, from, to, doc.layout);
      const dash = g.dashed ? ' stroke-dasharray="6 5"' : "";
      const color = relation.color ?? relationColor;
      const arrows = relation.arrows ?? "end";
      const marker = `url(#${markerFor(color)})`;
      const ends =
        (arrows === "none" ? "" : ` marker-end="${marker}"`) +
        (arrows === "both" ? ` marker-start="${marker}"` : "");
      const label = relation.label
        ? `<text x="${g.labelX}" y="${g.labelY - 6}" font-size="12" font-weight="600" fill="${color}" text-anchor="middle" stroke="${background}" stroke-width="4" paint-order="stroke">${escapeXml(relation.label)}</text>`
        : "";
      return `<path d="${g.path}" stroke="${color}" stroke-width="1.75" fill="none"${dash}${ends}/>${label}`;
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
    `<defs>${[...markerColors].map((color) => `<marker id="${markerFor(color)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`).join("")}</defs>`,
    `<rect x="${bounds.x - PADDING}" y="${bounds.y - PADDING}" width="${width}" height="${height}" fill="${background}"/>`,
    boundaries,
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
