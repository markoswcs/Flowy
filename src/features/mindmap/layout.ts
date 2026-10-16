import { branchColor, THEMES } from "@/features/mindmap/themes";
import type {
  Connector,
  LayoutResult,
  MapDoc,
  PlacedTopic,
  Size,
  ThemeId,
  Topic,
} from "@/features/mindmap/types";

const H_GAP = 56;
const SIBLING_GAP_FIRST = 22;
const SIBLING_GAP = 14;
const ORG_V_GAP = 48;
const ORG_H_GAP = 24;
const FLOW_V_GAP = 72;
const FLOW_H_GAP = 40;
const TREE_INDENT = 32;
const TREE_GAP = 10;
const AXIS_GAP = 18;
const COLUMN_GAP = 40;

type Side = PlacedTopic["side"];
type Measure = (topic: Topic, depth: number) => Size;

interface LNode {
  topic: Topic;
  depth: number;
  w: number;
  h: number;
  children: LNode[];
  span: number;
  color: string;
}

interface Ctx {
  measure: Measure;
  theme: ThemeId;
  placed: Map<string, PlacedTopic>;
}

interface Row {
  n: LNode;
  x: number;
  y: number;
  parentId: string | null;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function build(ctx: Ctx, topic: Topic, depth: number, color: string): LNode {
  const size = ctx.measure(topic, depth);
  const n: LNode = {
    topic,
    depth,
    w: Math.max(1, size.width),
    h: Math.max(1, size.height),
    children: [],
    span: 0,
    color,
  };
  if (!topic.collapsed) {
    topic.children.forEach((c, i) => {
      const childColor =
        depth === 0
          ? (c.style?.branch ?? branchColor(ctx.theme, i))
          : (c.style?.branch ?? color);
      n.children.push(build(ctx, c, depth + 1, childColor));
    });
  }
  return n;
}

function put(
  ctx: Ctx,
  n: LNode,
  x: number,
  y: number,
  side: Side,
  parentId: string | null,
) {
  ctx.placed.set(n.topic.id, {
    id: n.topic.id,
    x,
    y,
    width: n.w,
    height: n.h,
    depth: n.depth,
    side,
    parentId,
    branchColor: n.color,
  });
}

function siblingGap(depth: number): number {
  return depth === 1 ? SIBLING_GAP_FIRST : SIBLING_GAP;
}

function vSpan(n: LNode): number {
  let total = 0;
  for (const c of n.children) total += vSpan(c);
  if (n.children.length > 1)
    total += siblingGap(n.depth + 1) * (n.children.length - 1);
  n.span = Math.max(n.h, total);
  return n.span;
}

function hSpan(n: LNode, gap: number): number {
  let total = 0;
  for (const c of n.children) total += hSpan(c, gap);
  if (n.children.length > 1) total += gap * (n.children.length - 1);
  n.span = Math.max(n.w, total);
  return n.span;
}

function placeKidsH(
  ctx: Ctx,
  kids: LNode[],
  dir: 1 | -1,
  edge: number,
  cy: number,
  side: Side,
  parentId: string,
) {
  const first = kids[0];
  if (!first) return;
  const gap = siblingGap(first.depth);
  let total = gap * (kids.length - 1);
  for (const k of kids) total += k.span;
  let top = cy - total / 2;
  for (const k of kids) {
    const kcy = top + k.span / 2;
    placeH(ctx, k, dir, dir === 1 ? edge : edge - k.w, kcy, side, parentId);
    top += k.span + gap;
  }
}

function placeH(
  ctx: Ctx,
  n: LNode,
  dir: 1 | -1,
  x: number,
  cy: number,
  side: Side,
  parentId: string | null,
) {
  put(ctx, n, x, cy - n.h / 2, side, parentId);
  placeKidsH(
    ctx,
    n.children,
    dir,
    dir === 1 ? x + n.w + H_GAP : x - H_GAP,
    cy,
    side,
    n.topic.id,
  );
}

function layoutMindmap(ctx: Ctx, root: LNode) {
  vSpan(root);
  put(ctx, root, -root.w / 2, -root.h / 2, "right", null);
  const kids = root.children;
  let split = kids.length;
  if (kids.length > 1) {
    const total = kids.reduce((s, k) => s + k.span, 0);
    let prefix = 0;
    let bestDiff = Infinity;
    for (let k = 1; k < kids.length; k++) {
      prefix += kids[k - 1]?.span ?? 0;
      const diff = Math.abs(2 * prefix - total);
      if (diff <= bestDiff) {
        bestDiff = diff;
        split = k;
      }
    }
  }
  placeKidsH(
    ctx,
    kids.slice(0, split),
    1,
    root.w / 2 + H_GAP,
    0,
    "right",
    root.topic.id,
  );
  placeKidsH(
    ctx,
    kids.slice(split),
    -1,
    -root.w / 2 - H_GAP,
    0,
    "left",
    root.topic.id,
  );
}

function layoutLogic(ctx: Ctx, root: LNode, dir: 1 | -1) {
  vSpan(root);
  const side: Side = dir === 1 ? "right" : "left";
  put(ctx, root, -root.w / 2, -root.h / 2, side, null);
  placeKidsH(
    ctx,
    root.children,
    dir,
    dir === 1 ? root.w / 2 + H_GAP : -root.w / 2 - H_GAP,
    0,
    side,
    root.topic.id,
  );
}

function collectLevels(n: LNode, levels: number[]) {
  levels[n.depth] = Math.max(levels[n.depth] ?? 0, n.h);
  n.children.forEach((c) => collectLevels(c, levels));
}

function placeV(
  ctx: Ctx,
  n: LNode,
  left: number,
  rowTop: number[],
  gap: number,
  parentId: string | null,
) {
  put(
    ctx,
    n,
    left + (n.span - n.w) / 2,
    rowTop[n.depth] ?? 0,
    "down",
    parentId,
  );
  let total = gap * Math.max(0, n.children.length - 1);
  for (const c of n.children) total += c.span;
  let cursor = left + (n.span - total) / 2;
  for (const c of n.children) {
    placeV(ctx, c, cursor, rowTop, gap, n.topic.id);
    cursor += c.span + gap;
  }
}

function layoutTopDown(ctx: Ctx, root: LNode, vGap: number, hGap: number) {
  hSpan(root, hGap);
  const levels: number[] = [];
  collectLevels(root, levels);
  const rowTop: number[] = [];
  let y = 0;
  levels.forEach((h, d) => {
    rowTop[d] = y;
    y += h + vGap;
  });
  placeV(ctx, root, 0, rowTop, hGap, null);
}

function treeRows(
  n: LNode,
  x: number,
  y: number,
  parentId: string | null,
  out: Row[],
): number {
  out.push({ n, x, y, parentId });
  let bottom = y + n.h;
  let cursor = bottom + TREE_GAP;
  for (const c of n.children) {
    bottom = treeRows(c, x + TREE_INDENT, cursor, n.topic.id, out);
    cursor = bottom + TREE_GAP;
  }
  return bottom;
}

function layoutTree(ctx: Ctx, root: LNode) {
  const rows: Row[] = [];
  treeRows(root, 0, 0, null, rows);
  for (const r of rows) put(ctx, r.n, r.x, r.y, "down", r.parentId);
}

function layoutTimeline(ctx: Ctx, root: LNode) {
  put(ctx, root, 0, 0, "right", null);
  const axisY = root.h / 2;
  const end = { up: -Infinity, down: -Infinity };
  let lastStart = -Infinity;
  root.children.forEach((child, i) => {
    const side: "up" | "down" = i % 2 === 0 ? "up" : "down";
    const rows: Row[] = [];
    treeRows(child, 0, 0, root.topic.id, rows);
    let width = 0;
    for (const r of rows) width = Math.max(width, r.x + r.n.w);
    const base = root.w + H_GAP;
    const start = Math.max(base, end[side] + COLUMN_GAP, lastStart + 24);
    for (const r of rows) {
      const y =
        side === "down"
          ? axisY + AXIS_GAP + r.y
          : axisY - AXIS_GAP - r.y - r.n.h;
      put(ctx, r.n, start + r.x, y, side, r.parentId);
    }
    end[side] = start + width;
    lastStart = start;
  });
}

function bezier(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M${round(x1)} ${round(y1)}C${round(mx)} ${round(y1)} ${round(mx)} ${round(y2)} ${round(x2)} ${round(y2)}`;
}

function elbowDown(x1: number, y1: number, x2: number, y2: number): string {
  if (Math.abs(x2 - x1) < 0.5)
    return `M${round(x1)} ${round(y1)}L${round(x2)} ${round(y2)}`;
  const my = y1 + (y2 - y1) / 2;
  const dir = x2 > x1 ? 1 : -1;
  const r = Math.max(
    0,
    Math.min(10, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 4),
  );
  return (
    `M${round(x1)} ${round(y1)}L${round(x1)} ${round(my - r)}` +
    `Q${round(x1)} ${round(my)} ${round(x1 + dir * r)} ${round(my)}` +
    `L${round(x2 - dir * r)} ${round(my)}` +
    `Q${round(x2)} ${round(my)} ${round(x2)} ${round(my + r)}` +
    `L${round(x2)} ${round(y2)}`
  );
}

function treeElbow(p: PlacedTopic, c: PlacedTopic, up: boolean): string {
  const sx = p.x + Math.min(16, p.width / 2);
  const sy = up ? p.y : p.y + p.height;
  const cy = c.y + c.height / 2;
  const r = Math.max(0, Math.min(8, Math.abs(cy - sy), c.x - sx));
  const dy = up ? -1 : 1;
  return (
    `M${round(sx)} ${round(sy)}L${round(sx)} ${round(cy - dy * r)}` +
    `Q${round(sx)} ${round(cy)} ${round(sx + r)} ${round(cy)}L${round(c.x)} ${round(cy)}`
  );
}

function connectorWidth(depth: number): number {
  return Math.max(1.5, 3 - (depth - 1) * 0.75);
}

function buildConnectors(
  doc: MapDoc,
  placed: Map<string, PlacedTopic>,
  floatIds: Set<string>,
): Connector[] {
  const out: Connector[] = [];
  const rootPlaced = placed.get(doc.root.id);
  let axisPrev = rootPlaced ? rootPlaced.x + rootPlaced.width : 0;
  const axisY = rootPlaced ? rootPlaced.y + rootPlaced.height / 2 : 0;
  for (const c of placed.values()) {
    if (!c.parentId) continue;
    const p = placed.get(c.parentId);
    if (!p) continue;
    let path: string;
    if (
      floatIds.has(c.id) ||
      doc.layout === "mindmap" ||
      doc.layout === "logic-right" ||
      doc.layout === "logic-left"
    ) {
      const cy = c.y + c.height / 2;
      const py = p.y + p.height / 2;
      path =
        c.side === "left"
          ? bezier(p.x, py, c.x + c.width, cy)
          : bezier(p.x + p.width, py, c.x, cy);
    } else if (doc.layout === "org" || doc.layout === "flow") {
      path = elbowDown(
        p.x + p.width / 2,
        p.y + p.height,
        c.x + c.width / 2,
        c.y,
      );
    } else if (doc.layout === "tree") {
      path = treeElbow(p, c, false);
    } else if (c.depth === 1) {
      const cx = c.x + c.width / 2;
      const near = c.side === "up" ? c.y + c.height : c.y;
      path = `M${round(axisPrev)} ${round(axisY)}L${round(cx)} ${round(axisY)}L${round(cx)} ${round(near)}`;
      axisPrev = Math.max(axisPrev, cx);
    } else {
      path = treeElbow(p, c, c.side === "up");
    }
    out.push({
      from: p.id,
      to: c.id,
      path,
      color: c.branchColor,
      width: connectorWidth(c.depth),
    });
  }
  return out;
}

export function layoutMap(doc: MapDoc, measure: Measure): LayoutResult {
  const theme: ThemeId = THEMES[doc.theme] ? doc.theme : "flowy";
  const ctx: Ctx = { measure, theme, placed: new Map() };
  const root = build(ctx, doc.root, 0, THEMES[theme].root.fill);

  switch (doc.layout) {
    case "logic-right":
      layoutLogic(ctx, root, 1);
      break;
    case "logic-left":
      layoutLogic(ctx, root, -1);
      break;
    case "org":
      layoutTopDown(ctx, root, ORG_V_GAP, ORG_H_GAP);
      break;
    case "flow":
      layoutTopDown(ctx, root, FLOW_V_GAP, FLOW_H_GAP);
      break;
    case "tree":
      layoutTree(ctx, root);
      break;
    case "timeline":
      layoutTimeline(ctx, root);
      break;
    default:
      layoutMindmap(ctx, root);
  }

  const rootPlaced = ctx.placed.get(doc.root.id);
  if (rootPlaced) {
    const dx = -(rootPlaced.x + rootPlaced.width / 2);
    const dy = -(rootPlaced.y + rootPlaced.height / 2);
    if (dx !== 0 || dy !== 0) {
      for (const p of ctx.placed.values()) {
        p.x += dx;
        p.y += dy;
      }
    }
  }

  // Manual positions: each dragged topic carries its subtree along.
  const nudge = (topic: Topic, ox: number, oy: number) => {
    const nx = ox + (topic.offset?.x ?? 0);
    const ny = oy + (topic.offset?.y ?? 0);
    const p = ctx.placed.get(topic.id);
    if (p && (nx !== 0 || ny !== 0)) {
      p.x += nx;
      p.y += ny;
    }
    if (!topic.collapsed) topic.children.forEach((c) => nudge(c, nx, ny));
  };
  doc.root.children.forEach((c) => nudge(c, 0, 0));

  const floatIds = new Set<string>();
  doc.floating.forEach((f, i) => {
    const color =
      f.style?.branch ?? branchColor(theme, doc.root.children.length + i);
    const n = build(ctx, f, 0, color);
    vSpan(n);
    const x = Number.isFinite(f.x) ? f.x : 0;
    const y = Number.isFinite(f.y) ? f.y : 0;
    placeH(ctx, n, 1, x, y + n.h / 2, "right", null);
    const mark = (m: LNode) => {
      floatIds.add(m.topic.id);
      m.children.forEach(mark);
    };
    mark(n);
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ctx.placed.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + p.width);
    maxY = Math.max(maxY, p.y + p.height);
  }
  if (!Number.isFinite(minX)) {
    minX = minY = maxX = maxY = 0;
  }

  return {
    topics: ctx.placed,
    connectors: buildConnectors(doc, ctx.placed, floatIds),
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  };
}
