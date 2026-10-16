import { describe, expect, it } from "vitest";
import {
  addChild,
  addParent,
  addRelation,
  addSibling,
  createHistory,
  createMap,
  deleteRelation,
  deleteTopics,
  findParent,
  findTopic,
  flatten,
  moveTopic,
  neighbor,
  pathTo,
  pushHistory,
  redo,
  reorder,
  setAllCollapsed,
  toggleCollapse,
  undo,
  updateRelation,
  updateTopic,
  visibleTopics,
} from "@/features/mindmap/model";
import { layoutMap } from "@/features/mindmap/layout";
import { branchColor, THEMES } from "@/features/mindmap/themes";
import type { TemplateId, ThemeId } from "@/features/mindmap/types";

function firstChildId(doc: ReturnType<typeof createMap>, i = 0): string {
  const c = doc.root.children[i];
  if (!c) throw new Error("missing child");
  return c.id;
}

describe("createMap", () => {
  it("builds every template with defaults", () => {
    const ids: TemplateId[] = [
      "blank",
      "brainstorm",
      "project",
      "meeting",
      "study",
      "swot",
      "flowchart",
      "org",
    ];
    for (const id of ids) {
      const doc = createMap("Título", id);
      expect(doc.version).toBe(2);
      expect(doc.theme).toBe("flowy");
      expect(doc.root.children.length).toBeGreaterThan(0);
    }
    const blank = createMap("Meu mapa");
    expect(blank.layout).toBe("mindmap");
    expect(blank.root.text).toBe("Meu mapa");
    expect(blank.root.children.map((c) => c.text)).toEqual([
      "Ideia 1",
      "Ideia 2",
      "Ideia 3",
    ]);
  });

  it("builds the flowchart, meeting and org templates", () => {
    const flow = createMap("x", "flowchart");
    expect(flow.layout).toBe("flow");
    expect(flow.root.style?.shape).toBe("pill");
    const step = flow.root.children[0];
    expect(step?.style?.shape).toBe("rect");
    const decision = step?.children[0];
    expect(decision?.style?.shape).toBe("diamond");
    expect(decision?.children.map((c) => c.text)).toEqual(["Sim", "Não"]);
    const meeting = createMap("x", "meeting");
    expect(meeting.root.children.map((c) => c.text)).toEqual([
      "Pauta",
      "Decisões",
      "Próximos passos",
    ]);
    expect(
      meeting.root.children[2]?.children.every((c) => c.done === false),
    ).toBe(true);
    expect(createMap("x", "org").layout).toBe("org");
  });
});

describe("editing", () => {
  it("adds children, siblings and parents immutably", () => {
    const doc = createMap("A");
    const first = firstChildId(doc);
    const { doc: d1, id } = addChild(doc, first, "neto");
    expect(doc.root.children[0]?.children).toHaveLength(0);
    expect(findParent(d1, id)?.id).toBe(first);
    expect(pathTo(d1, id).map((t) => t.id)).toEqual([d1.root.id, first, id]);

    const { doc: d2, id: sib } = addSibling(d1, first, "irmão", true);
    expect(d2.root.children[0]?.id).toBe(sib);
    const { doc: d3, id: rootChild } = addSibling(
      d2,
      d2.root.id,
      "filho da raiz",
    );
    expect(findParent(d3, rootChild)?.id).toBe(d3.root.id);

    const { doc: d4, id: mid } = addParent(d3, id, "meio");
    expect(findParent(d4, id)?.id).toBe(mid);
    expect(findParent(d4, mid)?.id).toBe(first);
  });

  it("updates topics", () => {
    const doc = createMap("A");
    const id = firstChildId(doc);
    const next = updateTopic(doc, id, { text: "Novo", done: true });
    expect(findTopic(next, id)?.text).toBe("Novo");
    expect(findTopic(next, id)?.done).toBe(true);
    expect(findTopic(doc, id)?.text).toBe("Ideia 1");
  });

  it("deletes topics but never the root, and drops relations", () => {
    let doc = createMap("A");
    const a = firstChildId(doc, 0);
    const b = firstChildId(doc, 1);
    doc = addRelation(doc, a, b, "liga").doc;
    expect(deleteTopics(doc, [doc.root.id])).toBe(doc);
    const next = deleteTopics(doc, [a]);
    expect(findTopic(next, a)).toBeNull();
    expect(next.relations).toHaveLength(0);
    expect(doc.relations).toHaveLength(1);
    expect(flatten(next)).toHaveLength(flatten(doc).length - 1);
  });

  it("moves topics and refuses to move into own descendant", () => {
    let doc = createMap("A");
    const a = firstChildId(doc, 0);
    const b = firstChildId(doc, 1);
    const grand = addChild(doc, a, "g");
    doc = grand.doc;
    expect(moveTopic(doc, a, grand.id, 0)).toBe(doc);
    expect(moveTopic(doc, a, a, 0)).toBe(doc);
    expect(moveTopic(doc, doc.root.id, b, 0)).toBe(doc);

    const moved = moveTopic(doc, grand.id, b, 0);
    expect(findParent(moved, grand.id)?.id).toBe(b);
    expect(findTopic(moved, a)?.children).toHaveLength(0);

    const reordered = moveTopic(doc, b, doc.root.id, 0);
    expect(reordered.root.children[0]?.id).toBe(b);
  });

  it("reorders within the parent and ignores the edges", () => {
    const doc = createMap("A");
    const a = firstChildId(doc, 0);
    expect(reorder(doc, a, -1)).toBe(doc);
    const next = reorder(doc, a, 1);
    expect(next.root.children[1]?.id).toBe(a);
    expect(reorder(doc, doc.root.id, 1)).toBe(doc);
  });

  it("collapses and expands", () => {
    let doc = createMap("A", "project");
    const id = firstChildId(doc);
    const before = visibleTopics(doc).length;
    doc = toggleCollapse(doc, id);
    expect(findTopic(doc, id)?.collapsed).toBe(true);
    expect(visibleTopics(doc).length).toBeLessThan(before);
    expect(flatten(doc).length).toBe(before);
    doc = toggleCollapse(doc, id, false);
    expect(visibleTopics(doc).length).toBe(before);
    const all = setAllCollapsed(doc, true);
    expect(all.root.collapsed).toBeUndefined();
    expect(all.root.children.every((c) => c.collapsed)).toBe(true);
    expect(visibleTopics(all)).toHaveLength(1 + all.root.children.length);
  });

  it("manages relations", () => {
    const doc = createMap("A");
    const a = firstChildId(doc, 0);
    const b = firstChildId(doc, 1);
    const added = addRelation(doc, a, b);
    const updated = updateRelation(added.doc, added.id, {
      label: "x",
      style: "dashed",
    });
    expect(updated.relations[0]).toMatchObject({ label: "x", style: "dashed" });
    expect(deleteRelation(updated, added.id).relations).toHaveLength(0);
  });
});

describe("history", () => {
  it("undoes, redoes and skips identical docs", () => {
    const d0 = createMap("A");
    const d1 = updateTopic(d0, d0.root.id, { text: "B" });
    const d2 = updateTopic(d1, d1.root.id, { text: "C" });
    let h = createHistory(d0);
    h = pushHistory(h, d1);
    expect(pushHistory(h, d1)).toBe(h);
    h = pushHistory(h, d2);
    expect(undo(h).present).toBe(d1);
    expect(undo(undo(h)).present).toBe(d0);
    expect(undo(undo(undo(h))).present).toBe(d0);
    expect(redo(undo(h)).present).toBe(d2);
    expect(pushHistory(undo(h), d0).future).toHaveLength(0);
  });

  it("caps the past at 100 entries", () => {
    let doc = createMap("A");
    let h = createHistory(doc);
    for (let i = 0; i < 150; i++) {
      doc = updateTopic(doc, doc.root.id, { text: String(i) });
      h = pushHistory(h, doc);
    }
    expect(h.past).toHaveLength(100);
  });
});

describe("neighbor", () => {
  const measure = () => ({ width: 80, height: 30 });

  it("navigates parent/child on a mind map and between siblings", () => {
    const doc = createMap("A", "project");
    const mind = { ...doc, layout: "mindmap" as const };
    const { topics } = layoutMap(mind, measure);
    const root = mind.root.id;
    const right = neighbor(mind, "mindmap", root, "right", topics);
    expect(right).not.toBeNull();
    expect(topics.get(right ?? "")?.parentId).toBe(root);
    expect(neighbor(mind, "mindmap", right ?? "", "left", topics)).toBe(root);
    expect(
      neighbor(mind, "mindmap", right ?? "", "down", topics),
    ).not.toBeNull();
    expect(neighbor(mind, "mindmap", "nope", "down", topics)).toBeNull();
  });

  it("goes down to children and up to the parent in an org chart", () => {
    const doc = createMap("A", "org");
    const { topics } = layoutMap(doc, measure);
    const child = neighbor(doc, "org", doc.root.id, "down", topics);
    expect(topics.get(child ?? "")?.parentId).toBe(doc.root.id);
    expect(neighbor(doc, "org", child ?? "", "up", topics)).toBe(doc.root.id);
  });
});

describe("themes", () => {
  function luminance(hex: string): number {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return (
      0.2126 * (ch[0] ?? 0) + 0.7152 * (ch[1] ?? 0) + 0.0722 * (ch[2] ?? 0)
    );
  }
  function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
  }

  it("has AA contrast and at least six branch colours", () => {
    for (const id of Object.keys(THEMES) as ThemeId[]) {
      const t = THEMES[id];
      expect(t.branches.length).toBeGreaterThanOrEqual(6);
      expect(contrast(t.root.fill, t.root.color)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.topic.fill, t.topic.color)).toBeGreaterThanOrEqual(4.5);
      for (const b of t.branches)
        expect(contrast(b, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    }
    expect(THEMES.flowy.root.fill).toBe("#7C3AED");
    expect(branchColor("flowy", 8)).toBe(branchColor("flowy", 0));
    expect(branchColor("flowy", -1)).toBe(
      THEMES.flowy.branches[THEMES.flowy.branches.length - 1],
    );
  });
});
