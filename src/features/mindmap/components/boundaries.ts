import type { LayoutResult, MapDoc, Topic } from "@/features/mindmap/types";

export interface BoundaryRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color: string;
}

const PAD = 10;
const LABEL_SPACE = 20;

/** Frames around every topic that has a boundary, covering its visible subtree. */
export function boundaryRects(
  doc: MapDoc,
  layout: LayoutResult,
): BoundaryRect[] {
  const out: BoundaryRect[] = [];
  const extent = (topic: Topic, box: [number, number, number, number]) => {
    const placed = layout.topics.get(topic.id);
    if (placed) {
      box[0] = Math.min(box[0], placed.x);
      box[1] = Math.min(box[1], placed.y);
      box[2] = Math.max(box[2], placed.x + placed.width);
      box[3] = Math.max(box[3], placed.y + placed.height);
    }
    if (!topic.collapsed) topic.children.forEach((c) => extent(c, box));
  };
  const walk = (topic: Topic) => {
    if (topic.boundary && layout.topics.has(topic.id)) {
      const box: [number, number, number, number] = [
        Infinity,
        Infinity,
        -Infinity,
        -Infinity,
      ];
      extent(topic, box);
      const placed = layout.topics.get(topic.id);
      const top = topic.boundary.label ? LABEL_SPACE : 0;
      out.push({
        id: topic.id,
        x: box[0] - PAD,
        y: box[1] - PAD - top,
        width: box[2] - box[0] + PAD * 2,
        height: box[3] - box[1] + PAD * 2 + top,
        label: topic.boundary.label,
        color: topic.boundary.color ?? placed?.branchColor ?? "#7C3AED",
      });
    }
    if (!topic.collapsed) topic.children.forEach(walk);
  };
  walk(doc.root);
  doc.floating.forEach(walk);
  return out;
}
