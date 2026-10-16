import { describe, expect, it } from "vitest";

import { parseMapData, serializeMap } from "@/features/mindmap/convert";
import { layoutMap } from "@/features/mindmap/layout";
import {
  addChild,
  clearOffsets,
  createMap,
  setLayout,
  updateTopic,
} from "@/features/mindmap/model";
import type { MapDoc } from "@/features/mindmap/types";

const measure = () => ({ width: 100, height: 30 });

function mapWithGrandchild() {
  const base = createMap("Raiz", "blank");
  const first = base.root.children[0];
  if (!first) throw new Error("template has no children");
  const { doc, id } = addChild(base, first.id, "Neto");
  return { doc, childId: first.id, grandchildId: id };
}

function position(doc: MapDoc, id: string) {
  const placed = layoutMap(doc, measure).topics.get(id);
  if (!placed) throw new Error(`missing ${id}`);
  return { x: placed.x, y: placed.y };
}

describe("free topic position", () => {
  it("moves the topic and its subtree by the offset", () => {
    const { doc, childId, grandchildId } = mapWithGrandchild();
    const before = [position(doc, childId), position(doc, grandchildId)];
    const moved = updateTopic(doc, childId, { offset: { x: 40, y: -25 } });
    const after = [position(moved, childId), position(moved, grandchildId)];
    after.forEach((point, index) => {
      expect(point.x - before[index]!.x).toBe(40);
      expect(point.y - before[index]!.y).toBe(-25);
    });
  });

  it("keeps the root at the centre", () => {
    const { doc, childId } = mapWithGrandchild();
    const moved = updateTopic(doc, childId, { offset: { x: 500, y: 500 } });
    expect(position(moved, moved.root.id)).toEqual(position(doc, doc.root.id));
  });

  it("clearOffsets and layout changes restore the automatic layout", () => {
    const { doc, childId } = mapWithGrandchild();
    const moved = updateTopic(doc, childId, { offset: { x: 40, y: 10 } });
    expect(position(clearOffsets(moved), childId)).toEqual(
      position(doc, childId),
    );
    const relaid = setLayout(moved, "org");
    expect(JSON.stringify(relaid)).not.toContain("offset");
    expect(clearOffsets(doc)).toBe(doc);
  });

  it("survives save and load, dropping invalid values", () => {
    const { doc, childId } = mapWithGrandchild();
    const moved = updateTopic(doc, childId, { offset: { x: 12, y: 34 } });
    const loaded = parseMapData(serializeMap(moved), "Raiz");
    expect(loaded.root.children[0]?.offset).toEqual({ x: 12, y: 34 });

    const broken = JSON.parse(serializeMap(moved));
    broken.root.children[0].offset = { x: "a", y: 1 };
    expect(
      parseMapData(JSON.stringify(broken), "Raiz").root.children[0]?.offset,
    ).toBeUndefined();
  });
});
