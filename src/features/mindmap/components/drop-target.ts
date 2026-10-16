import { findParent, findTopic } from "@/features/mindmap/model";
import type {
  LayoutResult,
  MapDoc,
  PlacedTopic,
  Topic,
} from "@/features/mindmap/types";

export type DropTarget =
  | { kind: "child"; parentId: string; refId: string }
  | {
      kind: "sibling";
      parentId: string;
      index: number;
      refId: string;
      edge: "before" | "after";
      axis: "x" | "y";
    };

const EDGE_BAND = 0.28;

function subtreeIds(topic: Topic, into = new Set<string>()): Set<string> {
  into.add(topic.id);
  topic.children.forEach((child) => subtreeIds(child, into));
  return into;
}

function contains(p: PlacedTopic, x: number, y: number): boolean {
  return x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height;
}

function siblingAxis(
  doc: MapDoc,
  layout: LayoutResult,
  parent: Topic,
): "x" | "y" {
  const placed = parent.children
    .map((child) => layout.topics.get(child.id))
    .filter((p): p is PlacedTopic => Boolean(p));
  if (placed.length >= 2) {
    const xs = placed.map((p) => p.x + p.width / 2);
    const ys = placed.map((p) => p.y + p.height / 2);
    const spreadX = Math.max(...xs) - Math.min(...xs);
    const spreadY = Math.max(...ys) - Math.min(...ys);
    return spreadX > spreadY ? "x" : "y";
  }
  return doc.layout === "org" ||
    doc.layout === "flow" ||
    doc.layout === "timeline"
    ? "x"
    : "y";
}

function siblingTarget(
  doc: MapDoc,
  layout: LayoutResult,
  dragId: string,
  target: PlacedTopic,
  x: number,
  y: number,
): DropTarget | null {
  const parent = findParent(doc, target.id);
  if (!parent) return null;
  const axis = siblingAxis(doc, layout, parent);
  const ratio =
    axis === "y"
      ? (y - target.y) / target.height
      : (x - target.x) / target.width;
  if (ratio > EDGE_BAND && ratio < 1 - EDGE_BAND) return null;
  const edge = ratio <= EDGE_BAND ? "before" : "after";
  const remaining = parent.children.filter((child) => child.id !== dragId);
  const at = remaining.findIndex((child) => child.id === target.id);
  return {
    kind: "sibling",
    parentId: parent.id,
    index: at + (edge === "after" ? 1 : 0),
    refId: target.id,
    edge,
    axis,
  };
}

/** Where a dragged topic would land if released at map point (x, y). */
export function findDropTarget(
  doc: MapDoc,
  layout: LayoutResult,
  dragId: string,
  x: number,
  y: number,
): DropTarget | null {
  const dragged = findTopic(doc, dragId);
  if (!dragged || dragId === doc.root.id) return null;
  const excluded = subtreeIds(dragged);
  for (const placed of layout.topics.values()) {
    if (excluded.has(placed.id) || !contains(placed, x, y)) continue;
    return (
      siblingTarget(doc, layout, dragId, placed, x, y) ?? {
        kind: "child",
        parentId: placed.id,
        refId: placed.id,
      }
    );
  }
  return null;
}
