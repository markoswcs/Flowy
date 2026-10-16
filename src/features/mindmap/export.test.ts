import { describe, expect, it } from "vitest";
import {
  fromOutline,
  toMarkdown,
  toPlainText,
} from "@/features/mindmap/export";
import { createMap, updateTopic } from "@/features/mindmap/model";
import type { Topic } from "@/features/mindmap/types";

function shape(topics: Topic[]): unknown {
  return topics.map((t) => ({
    text: t.text,
    done: t.done,
    note: t.note,
    children: shape(t.children),
  }));
}

function simple(text: string, children: unknown[] = []) {
  return { text, done: undefined, note: undefined, children };
}

describe("toPlainText", () => {
  it("joins topic texts with a middle dot", () => {
    expect(toPlainText(createMap("Raiz"))).toBe(
      "Raiz · Ideia 1 · Ideia 2 · Ideia 3",
    );
  });
});

describe("toMarkdown / fromOutline", () => {
  it("round-trips structure, checkboxes and notes", () => {
    let doc = createMap("Reunião", "meeting");
    const first = doc.root.children[0];
    doc = updateTopic(doc, first?.id ?? "", { note: "linha 1\nlinha 2" });
    const md = toMarkdown(doc);
    expect(md.startsWith("- Reunião\n")).toBe(true);
    expect(md).toContain("  - Pauta\n    > linha 1\n    > linha 2\n");
    expect(md).toContain("- [ ] Tarefa 1");
    const back = fromOutline(md);
    expect(back).toHaveLength(1);
    expect(shape(back)).toEqual(shape([doc.root]));
  });

  it("parses dashes, stars, numbers, tabs and mixed indentation", () => {
    const text = [
      "- A",
      "\t* B",
      "\t\t1. C",
      "",
      "- D",
      "    - E",
      "        2) F",
      "  - G",
    ].join("\n");
    expect(shape(fromOutline(text))).toEqual([
      simple("A", [simple("B", [simple("C")])]),
      simple("D", [simple("E", [simple("F")]), simple("G")]),
    ]);
  });

  it("handles 2-space indentation, plain text and blank input", () => {
    const out = fromOutline("Pai\n  Filho\n  Filho 2\nOutro");
    expect(out.map((t) => t.text)).toEqual(["Pai", "Outro"]);
    expect(out[0]?.children.map((t) => t.text)).toEqual(["Filho", "Filho 2"]);
    expect(fromOutline("\n  \n")).toEqual([]);
  });

  it("parses checkboxes", () => {
    expect(
      fromOutline("- [x] feito\n- [ ] pendente").map((t) => t.done),
    ).toEqual([true, false]);
  });
});
