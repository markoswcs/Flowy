import { describe, expect, it } from "vitest";
import { layoutMap } from "@/features/mindmap/layout";
import {
  createMap,
  toggleCollapse,
  updateTopic,
} from "@/features/mindmap/model";
import type {
  LayoutKind,
  MapDoc,
  PlacedTopic,
  Topic,
} from "@/features/mindmap/types";

const measure = (t: Topic, depth: number) => ({
  width: 40 + t.text.length * 7,
  height: depth === 0 ? 44 : 30 + (t.text.length % 3) * 4,
});

function tree(l1: number, l2: number, l3: number): Topic {
  const mk = (text: string, children: Topic[]): Topic => ({
    id: crypto.randomUUID(),
    text,
    children,
  });
  return mk(
    "Raiz",
    Array.from({ length: l1 }, (_, i) =>
      mk(
        `Ramo ${i}`,
        Array.from({ length: l2 }, (_, j) =>
          mk(
            `Sub ${i}.${j}`,
            Array.from({ length: l3 }, (_, k) =>
              mk(`Folha ${i}.${j}.${k}`, []),
            ),
          ),
        ),
      ),
    ),
  );
}

function docWith(layout: LayoutKind, root: Topic): MapDoc {
  return { ...createMap("x"), layout, root };
}

function overlaps(a: PlacedTopic, b: PlacedTopic): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

function countOverlaps(boxes: PlacedTopic[]): number {
  let n = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a && b && overlaps(a, b)) n++;
    }
  }
  return n;
}

const LAYOUTS: LayoutKind[] = [
  "mindmap",
  "logic-right",
  "logic-left",
  "org",
  "tree",
  "timeline",
  "flow",
];

describe("layoutMap", () => {
  for (const layout of LAYOUTS) {
    it(`does not overlap boxes in ${layout}`, () => {
      const root = tree(5, 4, 4);
      const res = layoutMap(docWith(layout, root), measure);
      expect(res.topics.size).toBe(1 + 5 + 20 + 80);
      expect(countOverlaps([...res.topics.values()])).toBe(0);
      expect(res.connectors).toHaveLength(res.topics.size - 1);
      for (const p of res.topics.values()) {
        expect(p.x).toBeGreaterThanOrEqual(res.bounds.x - 0.001);
        expect(p.y + p.height).toBeLessThanOrEqual(
          res.bounds.y + res.bounds.height + 0.001,
        );
      }
    });

    it(`centres the root at the origin in ${layout}`, () => {
      const doc = docWith(layout, tree(3, 2, 0));
      const r = layoutMap(doc, measure).topics.get(doc.root.id);
      expect(r).toBeDefined();
      expect((r?.x ?? 1) + (r?.width ?? 0) / 2).toBeCloseTo(0);
      expect((r?.y ?? 1) + (r?.height ?? 0) / 2).toBeCloseTo(0);
    });
  }

  it("balances a mind map between both sides", () => {
    const doc = docWith("mindmap", tree(6, 3, 0));
    const res = layoutMap(doc, measure);
    const first = doc.root.children.map((c) => res.topics.get(c.id));
    const right = first.filter((p) => p?.side === "right");
    const left = first.filter((p) => p?.side === "left");
    expect(right).toHaveLength(3);
    expect(left).toHaveLength(3);
    const rootPlaced = res.topics.get(doc.root.id);
    expect(right.every((p) => (p?.x ?? 0) > (rootPlaced?.x ?? 0))).toBe(true);
    expect(left.every((p) => (p?.x ?? 0) < (rootPlaced?.x ?? 0))).toBe(true);
    const mid = (side: "left" | "right") => {
      const ys = [...res.topics.values()].filter(
        (p) => p.side === side && p.depth > 0,
      );
      const top = Math.min(...ys.map((p) => p.y));
      const bottom = Math.max(...ys.map((p) => p.y + p.height));
      return (top + bottom) / 2;
    };
    expect(Math.abs(mid("left"))).toBeLessThan(1);
    expect(Math.abs(mid("right"))).toBeLessThan(1);
  });

  it("puts everything on one side in logic layouts", () => {
    const doc = docWith("logic-left", tree(3, 2, 0));
    const res = layoutMap(doc, measure);
    const root = res.topics.get(doc.root.id);
    for (const p of res.topics.values()) {
      if (p.id !== doc.root.id)
        expect(p.x + p.width).toBeLessThan(root?.x ?? 0);
    }
    const right = layoutMap({ ...doc, layout: "logic-right" }, measure);
    for (const p of right.topics.values()) {
      if (p.id !== doc.root.id)
        expect(p.x).toBeGreaterThan((root?.x ?? 0) + (root?.width ?? 0));
    }
  });

  it("uses the documented gaps in org and flow layouts", () => {
    const doc = docWith("org", tree(2, 0, 0));
    const fixed = () => ({ width: 100, height: 40 });
    const res = layoutMap(doc, fixed);
    const r = res.topics.get(doc.root.id);
    const c = res.topics.get(doc.root.children[0]?.id ?? "");
    expect((c?.y ?? 0) - ((r?.y ?? 0) + (r?.height ?? 0))).toBe(48);
    const flow = layoutMap({ ...doc, layout: "flow" }, fixed);
    const fr = flow.topics.get(doc.root.id);
    const fc = flow.topics.get(doc.root.children[0]?.id ?? "");
    expect((fc?.y ?? 0) - ((fr?.y ?? 0) + (fr?.height ?? 0))).toBe(72);
  });

  it("indents tree children by 32px below previous siblings", () => {
    const doc = docWith("tree", tree(2, 1, 0));
    const res = layoutMap(doc, () => ({ width: 100, height: 40 }));
    const r = res.topics.get(doc.root.id);
    const a = res.topics.get(doc.root.children[0]?.id ?? "");
    const b = res.topics.get(doc.root.children[1]?.id ?? "");
    expect((a?.x ?? 0) - (r?.x ?? 0)).toBe(32);
    expect(b?.y ?? 0).toBeGreaterThan((a?.y ?? 0) + 40);
  });

  it("alternates timeline children above and below the axis", () => {
    const doc = docWith("timeline", tree(4, 1, 0));
    const res = layoutMap(doc, measure);
    const sides = doc.root.children.map((c) => res.topics.get(c.id)?.side);
    expect(sides).toEqual(["up", "down", "up", "down"]);
    for (const c of doc.root.children) {
      const p = res.topics.get(c.id);
      if (p?.side === "up") expect((p.y ?? 0) + p.height).toBeLessThan(0);
      else expect(p?.y ?? 0).toBeGreaterThan(0);
    }
  });

  it("hides descendants of collapsed topics", () => {
    const doc = docWith("mindmap", tree(2, 2, 2));
    const id = doc.root.children[0]?.id ?? "";
    const res = layoutMap(toggleCollapse(doc, id, true), measure);
    expect(res.topics.size).toBe(1 + 2 + 4 + 8 - (2 + 4));
    expect(res.topics.has(id)).toBe(true);
    expect(res.topics.has(doc.root.children[0]?.children[0]?.id ?? "")).toBe(
      false,
    );
  });

  it("colours branches and honours style.branch overrides", () => {
    let doc = docWith("mindmap", tree(2, 1, 1));
    const a = doc.root.children[0];
    const b = doc.root.children[1];
    doc = updateTopic(doc, b?.id ?? "", { style: { branch: "#123456" } });
    const res = layoutMap(doc, measure);
    const leaf = res.topics.get(b?.children[0]?.children[0]?.id ?? "");
    expect(leaf?.branchColor).toBe("#123456");
    expect(res.topics.get(a?.id ?? "")?.branchColor).not.toBe("#123456");
    const conn = res.connectors.find((c) => c.to === b?.id);
    expect(conn?.color).toBe("#123456");
    expect(conn?.width).toBe(3);
    expect(conn?.path.startsWith("M")).toBe(true);
  });

  it("places floating topics at their stored coordinates", () => {
    const doc = createMap("x");
    const floating = { id: "f1", text: "solto", children: [], x: 500, y: -300 };
    const res = layoutMap({ ...doc, floating: [floating] }, measure);
    const p = res.topics.get("f1");
    expect(p?.x).toBe(500);
    expect(p?.y).toBe(-300);
    expect(res.bounds.x + res.bounds.width).toBeGreaterThanOrEqual(
      500 + (p?.width ?? 0),
    );
  });

  it("lays out 1000 topics quickly in every layout", () => {
    const root = tree(10, 10, 9);
    for (const layout of LAYOUTS) {
      const start = performance.now();
      const res = layoutMap(docWith(layout, root), measure);
      expect(res.topics.size).toBe(1 + 10 + 100 + 900);
      expect(performance.now() - start).toBeLessThan(500);
    }
  });
});
