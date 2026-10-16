import type {
  LayoutKind,
  PlacedTopic,
  Relation,
} from "@/features/mindmap/types";

export interface RelationGeometry {
  path: string;
  labelX: number;
  labelY: number;
  dashed: boolean;
}

interface Point {
  x: number;
  y: number;
}

function centre(topic: PlacedTopic): Point {
  return { x: topic.x + topic.width / 2, y: topic.y + topic.height / 2 };
}

/** Point where the ray from the box centre towards `target` leaves the box. */
function boxExit(topic: PlacedTopic, target: Point, gap = 4): Point {
  const c = centre(topic);
  const dx = target.x - c.x;
  const dy = target.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const halfW = topic.width / 2 + gap;
  const halfH = topic.height / 2 + gap;
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  return { x: c.x + dx * scale, y: c.y + dy * scale };
}

export function isStraight(relation: Relation, layout: LayoutKind): boolean {
  if (relation.style) return relation.style === "straight";
  return layout === "flow";
}

export function relationGeometry(
  relation: Relation,
  from: PlacedTopic,
  to: PlacedTopic,
  layout: LayoutKind,
): RelationGeometry {
  const straight = isStraight(relation, layout);
  const dashed = relation.style ? relation.style === "dashed" : !straight;
  const a = centre(from);
  const b = centre(to);
  if (straight) {
    const start = boxExit(from, b);
    const end = boxExit(to, a, 6);
    return {
      path: `M${start.x},${start.y} L${end.x},${end.y}`,
      labelX: (start.x + end.x) / 2,
      labelY: (start.y + end.y) / 2,
      dashed,
    };
  }
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const bend = Math.min(160, length * 0.35);
  const control = {
    x: (a.x + b.x) / 2 + ((b.y - a.y) / length) * bend,
    y: (a.y + b.y) / 2 - ((b.x - a.x) / length) * bend,
  };
  const start = boxExit(from, control);
  const end = boxExit(to, control, 6);
  return {
    path: `M${start.x},${start.y} Q${control.x},${control.y} ${end.x},${end.y}`,
    labelX: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
    labelY: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
    dashed,
  };
}
