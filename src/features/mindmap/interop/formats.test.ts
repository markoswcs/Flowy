import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { parseMapData } from "@/features/mindmap/convert";
import { createMap, findTopic, flatten } from "@/features/mindmap/model";
import type { MapDoc, Topic } from "@/features/mindmap/types";
import {
  importMapFile,
  toFreeMind,
  toOpml,
  toXmindContent,
  toXmindFile,
} from "@/features/mindmap/interop/formats";
import { readZipText } from "@/features/mindmap/interop/zip";

const encoder = new TextEncoder();

function richMap(): MapDoc {
  const leaf: Topic = {
    id: "leaf",
    text: "Folha",
    children: [],
    note: "Linha 1\nLinha 2",
    link: "https://example.com",
    labels: ["urgente", "cliente"],
    priority: 2,
    progress: 50,
    style: { bold: true, italic: true, fill: "#2563EB" },
    icon: "💡",
  };
  const branch: Topic = {
    id: "branch",
    text: "Ramo",
    children: [leaf],
    collapsed: true,
    boundary: { label: "Grupo" },
  };
  const other: Topic = { id: "other", text: "Outro", children: [] };
  return {
    version: 2,
    layout: "logic-right",
    theme: "flowy",
    root: { id: "root", text: "Centro", children: [branch, other] },
    floating: [],
    relations: [{ id: "rel", from: "leaf", to: "other", label: "depende" }],
  };
}

function texts(doc: MapDoc): string[] {
  return flatten(doc).map((t) => t.text);
}

/** A single-entry ZIP compressed with deflate, like files saved by XMind. */
function deflatedZip(name: string, content: string): Uint8Array {
  const nameBytes = encoder.encode(name);
  const data = encoder.encode(content);
  const packed = deflateRawSync(data);
  const local = new Uint8Array(30 + nameBytes.length + packed.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(8, 8, true);
  lv.setUint32(18, packed.length, true);
  lv.setUint32(22, data.length, true);
  lv.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);
  local.set(packed, 30 + nameBytes.length);
  const central = new Uint8Array(46 + nameBytes.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(10, 8, true);
  cv.setUint32(20, packed.length, true);
  cv.setUint32(24, data.length, true);
  cv.setUint16(28, nameBytes.length, true);
  central.set(nameBytes, 46);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(12, central.length, true);
  ev.setUint32(16, local.length, true);
  const out = new Uint8Array(local.length + central.length + end.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(end, local.length + central.length);
  return out;
}

describe("XMind", () => {
  it("round-trips topics, markers, notes, labels and relationships", async () => {
    const file = toXmindFile(richMap(), "Meu mapa");
    const doc = await importMapFile("meu.xmind", file);
    expect(texts(doc)).toEqual(["Centro", "Ramo", "Folha", "Outro"]);
    expect(doc.layout).toBe("logic-right");
    const leaf = findTopic(doc, "leaf");
    expect(leaf).toMatchObject({
      note: "Linha 1\nLinha 2",
      link: "https://example.com",
      labels: ["urgente", "cliente"],
      priority: 2,
      progress: 50,
      icon: "💡",
      style: { bold: true, italic: true, fill: "#2563EB" },
    });
    expect(findTopic(doc, "branch")).toMatchObject({
      collapsed: true,
      boundary: { label: "Grupo" },
    });
    expect(doc.relations).toEqual([
      expect.objectContaining({ from: "leaf", to: "other", label: "depende" }),
    ]);
  });

  it("writes content.json and the XMind 8 content.xml", async () => {
    const files = await readZipText(toXmindFile(richMap(), "T"), () => true);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "content.json",
        "content.xml",
        "manifest.json",
        "metadata.json",
        "META-INF/manifest.xml",
      ]),
    );
    const sheet = JSON.parse(files["content.json"] ?? "[]")[0];
    expect(sheet.rootTopic.structureClass).toBe("org.xmind.ui.logic.right");
  });

  it("reads deflate-compressed files saved by XMind", async () => {
    const zip = deflatedZip(
      "content.json",
      toXmindContent(createMap("Plano", "project"), "Plano"),
    );
    const doc = await importMapFile("plano.xmind", zip);
    expect(doc.root.text).toBe("Plano");
    expect(doc.root.children.map((c) => c.text)).toContain("Objetivo");
  });

  it("reads legacy XMind 8 content.xml", async () => {
    const xml = `<?xml version="1.0"?><xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:xlink="http://www.w3.org/1999/xlink"><sheet id="s"><topic id="r" structure-class="org.xmind.ui.org-chart.down"><title>Raiz</title><children><topics type="attached"><topic id="a" xlink:href="https://a.dev"><title>A</title><marker-refs><marker-ref marker-id="priority-1"/></marker-refs></topic></topics></children></topic></sheet></xmap-content>`;
    const doc = await importMapFile(
      "old.xmind",
      deflatedZip("content.xml", xml),
    );
    expect(doc.layout).toBe("org");
    expect(doc.root.children[0]).toMatchObject({
      text: "A",
      link: "https://a.dev",
      priority: 1,
    });
  });
});

describe("FreeMind / MindMeister .mm", () => {
  it("round-trips text, notes, links, icons and arrows", async () => {
    const mm = toFreeMind(richMap());
    expect(mm).toContain('<map version="1.0.1">');
    const doc = await importMapFile("mapa.mm", encoder.encode(mm));
    expect(texts(doc)).toEqual(["Centro", "Ramo", "Folha", "Outro"]);
    expect(findTopic(doc, "leaf")).toMatchObject({
      note: "Linha 1\nLinha 2",
      link: "https://example.com",
      priority: 2,
      icon: "💡",
    });
    expect(doc.relations).toEqual([
      expect.objectContaining({ from: "leaf", to: "other" }),
    ]);
  });
});

describe("other formats", () => {
  it("round-trips OPML with notes", async () => {
    const doc = await importMapFile(
      "a.opml",
      encoder.encode(toOpml(richMap(), "T")),
    );
    expect(texts(doc)).toEqual(["Centro", "Ramo", "Folha", "Outro"]);
    expect(doc.root.children[0]?.children[0]?.note).toBe("Linha 1\nLinha 2");
  });

  it("imports Markdown outlines, wrapping several top-level items", async () => {
    const doc = await importMapFile(
      "lista.md",
      encoder.encode("- Um\n  - Um.1\n- Dois\n"),
    );
    expect(doc.root.text).toBe("lista");
    expect(doc.root.children.map((c) => c.text)).toEqual(["Um", "Dois"]);
  });

  it("imports MindMeister-style zipped map.json", async () => {
    const json = JSON.stringify({
      root: {
        title: "Ideia",
        children: [{ title: "Filho", note: "obs", closed: true, children: [] }],
      },
    });
    const doc = await importMapFile("m.mind", deflatedZip("map.json", json));
    expect(doc.root.text).toBe("Ideia");
    expect(doc.root.children[0]).toMatchObject({ text: "Filho", note: "obs" });
  });

  it("keeps Flowy JSON as is and rejects unknown files", async () => {
    const original = richMap();
    const doc = await importMapFile(
      "x.json",
      encoder.encode(JSON.stringify(original)),
    );
    expect(texts(doc)).toEqual(texts(original));
    await expect(
      importMapFile("x.xmind", encoder.encode("PK garbage")),
    ).rejects.toThrow();
  });
});

describe("loader hardening", () => {
  it("rejects image data URLs that could break out of an attribute", () => {
    const doc = parseMapData(
      JSON.stringify({
        version: 2,
        root: {
          id: "r",
          text: "R",
          children: [],
          image: {
            src: 'data:image/png;base64,"onload="alert(1)',
            width: 10,
            height: 10,
          },
        },
      }),
      "T",
    );
    expect(doc.root.image).toBeUndefined();
  });

  it("keeps Markdown heading levels as nesting", async () => {
    const doc = await importMapFile(
      "t.md",
      encoder.encode("# Projeto\n## Fase 1\n### Tarefa\n## Fase 2\n"),
    );
    expect(doc.root.text).toBe("Projeto");
    expect(doc.root.children.map((c) => c.text)).toEqual(["Fase 1", "Fase 2"]);
    expect(doc.root.children[0]?.children[0]?.text).toBe("Tarefa");
  });

  it("refuses XML with DOCTYPE or entity declarations", async () => {
    const bomb = `<?xml version="1.0"?><!DOCTYPE map [<!ENTITY a "aaaa">]><map><node TEXT="&a;"/></map>`;
    await expect(
      importMapFile("bomba.mm", encoder.encode(bomb)),
    ).rejects.toThrow();
  });

  it("drops non-hex colours and unsafe images from imported data", () => {
    const doc = parseMapData(
      JSON.stringify({
        version: 2,
        layout: "mindmap",
        theme: "flowy",
        root: {
          id: "r",
          text: "R",
          children: [],
          style: { fill: '"/><script>', border: "#ABCDEF", size: "xl" },
          image: { src: "javascript:alert(1)", width: 10, height: 10 },
          labels: ["a", 3, ""],
          due: "2026-13-99x",
        },
        floating: [],
        relations: [],
        branchStyle: "elbow",
      }),
      "T",
    );
    expect(doc.root.style).toEqual({ border: "#ABCDEF", size: "xl" });
    expect(doc.root.image).toBeUndefined();
    expect(doc.root.labels).toEqual(["a"]);
    expect(doc.root.due).toBeUndefined();
    expect(doc.branchStyle).toBe("elbow");
  });
});
