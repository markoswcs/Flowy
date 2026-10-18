import { flatten } from "@/features/mindmap/model";
import { THEMES } from "@/features/mindmap/themes";
import type { LayoutResult, MapDoc } from "@/features/mindmap/types";
import { topicAppearance } from "@/features/mindmap/components/appearance";
import { boundaryRects } from "@/features/mindmap/components/boundaries";
import { measureTopicBox } from "@/features/mindmap/components/measure";
import { isStraight } from "@/features/mindmap/components/relation-geometry";
import { floatingTopicIds } from "@/features/mindmap/components/tree-ops";

/** Excalidraw font ids: 5 = Excalifont (hand-drawn), 6 = Nunito. */
const SKETCH_FONT = 5;
const CLEAN_FONT = 6;

export interface ExcalidrawScene {
  type: "excalidraw";
  version: 2;
  source: string;
  elements: unknown[];
  appState: { viewBackgroundColor: string };
  files: Record<string, unknown>;
}

type Skeleton = Record<string, unknown>;

/**
 * Turns the laid-out map into an Excalidraw scene: shapes with bound text,
 * arrows bound to their topics (they follow when shapes move), boundaries
 * and images. Loads Excalidraw only when called.
 */
export async function mapToExcalidraw(
  doc: MapDoc,
  layout: LayoutResult,
  dark: boolean,
): Promise<ExcalidrawScene> {
  const { convertToExcalidrawElements } =
    await import("@excalidraw/excalidraw");
  const theme = THEMES[doc.theme] ?? THEMES.flowy;
  const topics = new Map(flatten(doc).map((t) => [t.id, t]));
  const floating = floatingTopicIds(doc);
  const fontFamily = doc.sketch ? SKETCH_FONT : CLEAN_FONT;
  const roughness = doc.sketch ? 1 : 0;
  const files: Record<string, unknown> = {};
  const skeleton: Skeleton[] = [];

  for (const b of boundaryRects(doc, layout)) {
    skeleton.push({
      type: "rectangle",
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      strokeColor: b.color,
      backgroundColor: "transparent",
      strokeStyle: "dashed",
      roughness,
      roundness: { type: 3 },
    });
    if (b.label)
      skeleton.push({
        type: "text",
        x: b.x + 12,
        y: b.y + 4,
        text: b.label,
        fontSize: 14,
        fontFamily,
        strokeColor: b.color,
      });
  }

  for (const placed of layout.topics.values()) {
    const topic = topics.get(placed.id);
    if (!topic) continue;
    const depth = placed.depth + (floating.has(placed.id) ? 1 : 0);
    const box = measureTopicBox(topic, depth, doc.layout);
    const look = topicAppearance(
      topic,
      depth,
      placed.branchColor,
      theme,
      doc.layout,
      dark,
    );
    const type =
      look.shape === "diamond"
        ? "diamond"
        : look.shape === "ellipse"
          ? "ellipse"
          : "rectangle";
    const bare = look.shape === "none" || look.shape === "underline";
    const prefix = [
      topic.done !== undefined ? (topic.done ? "☑ " : "☐ ") : "",
      topic.priority ? `P${topic.priority} ` : "",
      topic.icon ? `${topic.icon} ` : "",
    ].join("");
    skeleton.push({
      type,
      id: topic.id,
      x: placed.x,
      y: placed.y,
      width: placed.width,
      height: placed.height,
      backgroundColor: look.fill === "transparent" ? "transparent" : look.fill,
      strokeColor: bare
        ? "transparent"
        : look.border === "transparent"
          ? look.fill
          : look.border,
      strokeStyle: look.dashed ? "dashed" : "solid",
      fillStyle: "solid",
      roughness,
      roundness:
        type === "rectangle" && look.shape !== "rect" ? { type: 3 } : null,
      link: topic.link ?? null,
      label: {
        text: prefix + (topic.text || " "),
        fontSize: box.metrics.fontSize,
        fontFamily,
        strokeColor: look.color,
      },
    });
    if (topic.image) {
      const fileId = `img-${topic.id}`;
      files[fileId] = {
        id: fileId,
        dataURL: topic.image.src,
        mimeType: /^data:([^;]+);/.exec(topic.image.src)?.[1] ?? "image/png",
        created: Date.now(),
      };
      skeleton.push({
        type: "image",
        fileId,
        x: placed.x + (placed.width - topic.image.width) / 2,
        y: placed.y - topic.image.height - 8,
        width: topic.image.width,
        height: topic.image.height,
      });
    }
  }

  for (const c of layout.connectors) {
    const from = layout.topics.get(c.from);
    const to = layout.topics.get(c.to);
    if (!from || !to) continue;
    skeleton.push({
      type: "arrow",
      x: from.x + from.width / 2,
      y: from.y + from.height / 2,
      width: to.x - from.x,
      height: to.y - from.y,
      strokeColor: c.color,
      strokeWidth: Math.max(1, Math.round(c.width)),
      roughness,
      endArrowhead: doc.layout === "flow" ? "arrow" : null,
      start: { id: c.from },
      end: { id: c.to },
    });
  }

  for (const r of doc.relations) {
    const from = layout.topics.get(r.from);
    const to = layout.topics.get(r.to);
    if (!from || !to) continue;
    const dashed = r.style ? r.style === "dashed" : !isStraight(r, doc.layout);
    const arrows = r.arrows ?? "end";
    skeleton.push({
      type: "arrow",
      x: from.x + from.width / 2,
      y: from.y + from.height / 2,
      width: to.x - from.x,
      height: to.y - from.y,
      strokeColor: r.color ?? (dark ? "#CBD5E1" : "#475569"),
      strokeStyle: dashed ? "dashed" : "solid",
      roughness,
      startArrowhead: arrows === "both" ? "arrow" : null,
      endArrowhead: arrows === "none" ? null : "arrow",
      start: { id: r.from },
      end: { id: r.to },
      ...(r.label
        ? { label: { text: r.label, fontSize: 14, fontFamily } }
        : {}),
    });
  }

  // Excalidraw opens at the origin; move the map there instead of around 0,0.
  const dx = 80 - layout.bounds.x;
  const dy = 80 - layout.bounds.y;
  for (const item of skeleton) {
    item.x = Number(item.x) + dx;
    item.y = Number(item.y) + dy;
  }

  const elements = convertToExcalidrawElements(
    skeleton as Parameters<typeof convertToExcalidrawElements>[0],
    { regenerateIds: false },
  );
  return {
    type: "excalidraw",
    version: 2,
    source: "https://flowy.app",
    elements,
    appState: {
      viewBackgroundColor: dark ? theme.canvas.dark : theme.canvas.light,
    },
    files,
  };
}
