import { describe, expect, it } from "vitest";
import {
  parseMapData,
  serializeMap,
  TEMPLATES,
} from "@/features/mindmap/convert";
import { createMap, flatten } from "@/features/mindmap/model";

describe("parseMapData", () => {
  it("round-trips v2 documents", () => {
    const doc = createMap("Teste", "swot");
    expect(parseMapData(serializeMap(doc), "outro")).toEqual(doc);
  });

  it("converts Mind Elixir data", () => {
    const raw = JSON.stringify({
      nodeData: {
        id: "root",
        topic: "Central",
        children: [
          {
            id: "a",
            topic: "A",
            expanded: false,
            style: {
              background: "#ff0000",
              color: "#ffffff",
              fontWeight: "bold",
            },
            icons: ["🔥", "x"],
            hyperLink: "https://example.com",
            note: "nota",
            children: [{ id: "a1", topic: "A1" }],
          },
          { id: "b", topic: "B" },
        ],
      },
      arrows: [
        { id: "r1", from: "a", to: "b", label: "liga" },
        { id: "r2", from: "a", to: "ghost", label: "x" },
      ],
      direction: 1,
    });
    const doc = parseMapData(raw, "t");
    expect(doc.layout).toBe("logic-right");
    expect(doc.root.text).toBe("Central");
    const a = doc.root.children[0];
    expect(a).toMatchObject({
      id: "a",
      text: "A",
      collapsed: true,
      icon: "🔥",
      link: "https://example.com",
      note: "nota",
      style: { fill: "#ff0000", color: "#ffffff", bold: true },
    });
    expect(a?.children[0]?.text).toBe("A1");
    expect(doc.relations).toEqual([
      { id: "r1", from: "a", to: "b", label: "liga", style: "curve" },
    ]);
  });

  it("maps Mind Elixir directions", () => {
    const base = { nodeData: { id: "r", topic: "R" } };
    expect(
      parseMapData(JSON.stringify({ ...base, direction: 0 }), "t").layout,
    ).toBe("logic-left");
    expect(
      parseMapData(JSON.stringify({ ...base, direction: 2 }), "t").layout,
    ).toBe("mindmap");
    expect(parseMapData(JSON.stringify(base), "t").layout).toBe("mindmap");
  });

  it("never throws on garbage", () => {
    const inputs = [
      null,
      "",
      "not json",
      "{",
      "[]",
      "42",
      "null",
      '"str"',
      '{"nodeData": 5}',
      '{"root": []}',
      '{"version":2,"root":null}',
    ];
    for (const raw of inputs) {
      const doc = parseMapData(raw, "Fallback");
      expect(doc.version).toBe(2);
      expect(doc.root.text).toBe("Fallback");
      expect(doc.root.children).toHaveLength(3);
    }
  });

  it("validates v2 documents defensively", () => {
    const raw = JSON.stringify({
      version: 2,
      layout: "weird",
      theme: "neon",
      root: {
        id: "r",
        text: "Raiz",
        children: [
          { id: "r", text: "dup" },
          "bad",
          { text: 7, priority: 9, style: { shape: "blob", fill: "#fff" } },
        ],
      },
      floating: [{ id: "f", text: "solto" }, 3],
      relations: [
        { id: "x", from: "r", to: "f" },
        { from: "r", to: "nowhere" },
        null,
      ],
    });
    const doc = parseMapData(raw, "t");
    expect(doc.layout).toBe("mindmap");
    expect(doc.theme).toBe("flowy");
    expect(doc.root.children).toHaveLength(2);
    const ids = flatten(doc).map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(doc.root.children[1]?.text).toBe("7");
    expect(doc.root.children[1]?.priority).toBeUndefined();
    expect(doc.root.children[1]?.style).toEqual({ fill: "#fff" });
    expect(doc.floating).toEqual([
      { id: "f", text: "solto", children: [], x: 0, y: 0 },
    ]);
    expect(doc.relations).toEqual([{ id: "x", from: "r", to: "f" }]);
  });

  it("fills missing arrays with defaults", () => {
    const doc = parseMapData(
      JSON.stringify({ version: 2, root: { id: "r", text: "R" } }),
      "t",
    );
    expect(doc.root.children).toEqual([]);
    expect(doc.floating).toEqual([]);
    expect(doc.relations).toEqual([]);
  });
});

describe("TEMPLATES", () => {
  it("describes every template with its real layout", () => {
    expect(TEMPLATES).toHaveLength(8);
    for (const t of TEMPLATES) {
      expect(t.label).not.toBe("");
      expect(t.description).not.toBe("");
      expect(createMap("x", t.id).layout).toBe(t.layout);
    }
  });
});
