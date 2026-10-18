import { parseMapData, serializeMap } from "@/features/mindmap/convert";
import { fromOutline } from "@/features/mindmap/export";
import type {
  LayoutKind,
  MapDoc,
  Relation,
  Topic,
  TopicProgress,
} from "@/features/mindmap/types";
import { createZip, isZip, readZipText } from "@/features/mindmap/interop/zip";

/**
 * Import/export for other mind map apps:
 * - XMind (.xmind: content.json for XMind 2020+, content.xml for XMind 8)
 * - FreeMind (.mm), which MindMeister, XMind and Freeplane all read and write
 * - MindMeister (.mind: zipped map.json)
 * - OPML, indented text / Markdown and Flowy JSON
 */

type Raw = Record<string, unknown>;

const MAX_DEPTH = 200;

function isObject(v: unknown): v is Raw {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function escapeXml(value: string): string {
  // Newlines too: XML parsers fold raw line breaks in attributes into spaces.
  return value.replace(/[&<>"'\n\r\t]/g, (char) => `&#${char.charCodeAt(0)};`);
}

function walk(topic: Topic, fn: (t: Topic) => void) {
  fn(topic);
  topic.children.forEach((c) => walk(c, fn));
}

/** Runs a raw tree through the regular loader, which validates every field. */
function finish(raw: Raw, title: string): MapDoc {
  return parseMapData(JSON.stringify({ version: 2, ...raw }), title);
}

// ---------------------------------------------------------------- markers

const XMIND_LAYOUTS: [string, LayoutKind][] = [
  ["org.xmind.ui.logic.right", "logic-right"],
  ["org.xmind.ui.logic.left", "logic-left"],
  ["org.xmind.ui.org-chart.down", "org"],
  ["org.xmind.ui.tree.right", "tree"],
  ["org.xmind.ui.timeline.horizontal", "timeline"],
];

function xmindStructure(layout: LayoutKind): string {
  if (layout === "flow") return "org.xmind.ui.org-chart.down";
  return (
    XMIND_LAYOUTS.find(([, l]) => l === layout)?.[0] ??
    "org.xmind.ui.map.clockwise"
  );
}

function layoutFromXmind(structure: unknown): LayoutKind {
  const s = typeof structure === "string" ? structure : "";
  return (
    XMIND_LAYOUTS.find(([key]) => s.startsWith(key))?.[1] ??
    (s.includes("logic.left") || s.includes("leftHeaded")
      ? "logic-left"
      : s.includes("org-chart") || s.includes("tree.down")
        ? "org"
        : s.includes("timeline")
          ? "timeline"
          : s.includes("logic") || s.includes("fishbone")
            ? "logic-right"
            : "mindmap")
  );
}

const PROGRESS_MARKERS: [string, TopicProgress][] = [
  ["task-start", 0],
  ["task-oct", 25],
  ["task-quarter", 25],
  ["task-3oct", 25],
  ["task-half", 50],
  ["task-5oct", 50],
  ["task-3quar", 75],
  ["task-7oct", 75],
  ["task-done", 100],
];

const PROGRESS_TO_XMIND: Record<TopicProgress, string> = {
  0: "task-start",
  25: "task-quarter",
  50: "task-half",
  75: "task-3quar",
  100: "task-done",
};

/** Our emoji icons ↔ XMind marker ids ↔ FreeMind built-in icons. */
const ICONS: [string, string, string][] = [
  ["✅", "symbol-right", "button_ok"],
  ["⭐", "star-yellow", "bookmark"],
  ["💡", "symbol-idea", "idea"],
  ["❓", "symbol-question", "help"],
  ["⚠️", "symbol-attention", "messagebox_warning"],
  ["📅", "symbol-calendar", "calendar"],
  ["👤", "people-blue", "male1"],
  ["📎", "symbol-attachment", "attach"],
  ["🚀", "symbol-rocket", "launch"],
  ["👍", "symbol-thumbup", "yes"],
  ["👎", "symbol-thumbdown", "stop-sign"],
  ["⏳", "symbol-clock", "clock"],
  ["🔒", "symbol-lock", "password"],
  ["🏁", "flag-green", "flag"],
  ["❤️", "symbol-heart", "ksmiletris"],
];

function iconFromXmind(markerId: string): string | undefined {
  const exact = ICONS.find(([, x]) => x === markerId)?.[0];
  if (exact) return exact;
  if (markerId.startsWith("flag-")) return "🏁";
  if (markerId.startsWith("star-")) return "⭐";
  if (markerId.startsWith("smiley-")) return "❤️";
  if (markerId.startsWith("people-")) return "👤";
  return undefined;
}

// ------------------------------------------------------------ XMind (JSON)

interface XTopicOut {
  id: string;
  class: "topic";
  title: string;
  structureClass?: string;
  children?: { attached?: XTopicOut[]; detached?: XTopicOut[] };
  notes?: { plain: { content: string } };
  href?: string;
  labels?: string[];
  markers?: { markerId: string }[];
  branch?: "folded";
  boundaries?: { id: string; range: string; title?: string }[];
  position?: { x: number; y: number };
  style?: { id: string; properties: Record<string, string> };
}

function xmindStyle(topic: Topic): XTopicOut["style"] {
  const s = topic.style;
  if (!s) return undefined;
  const properties: Record<string, string> = {};
  if (s.fill) properties["svg:fill"] = s.fill;
  if (s.color) properties["fo:color"] = s.color;
  if (s.bold) properties["fo:font-weight"] = "bold";
  if (s.italic) properties["fo:font-style"] = "italic";
  if (s.strike) properties["fo:text-decoration"] = "line-through";
  if (s.branch) properties["line-color"] = s.branch;
  if (s.border) properties["border-line-color"] = s.border;
  return Object.keys(properties).length
    ? { id: crypto.randomUUID(), properties }
    : undefined;
}

function toXTopic(topic: Topic, depth: number): XTopicOut {
  const out: XTopicOut = { id: topic.id, class: "topic", title: topic.text };
  if (topic.children.length && depth < MAX_DEPTH)
    out.children = {
      attached: topic.children.map((c) => toXTopic(c, depth + 1)),
    };
  if (topic.note) out.notes = { plain: { content: topic.note } };
  if (topic.link) out.href = topic.link;
  if (topic.labels?.length) out.labels = topic.labels;
  const markers: { markerId: string }[] = [];
  if (topic.priority) markers.push({ markerId: `priority-${topic.priority}` });
  if (topic.progress !== undefined)
    markers.push({ markerId: PROGRESS_TO_XMIND[topic.progress] });
  else if (topic.done !== undefined)
    markers.push({ markerId: topic.done ? "task-done" : "task-start" });
  const icon = ICONS.find(([emoji]) => emoji === topic.icon)?.[1];
  if (icon) markers.push({ markerId: icon });
  if (markers.length) out.markers = markers;
  if (topic.collapsed) out.branch = "folded";
  const boundaries = topic.children
    .map((child, index) =>
      child.boundary
        ? {
            id: crypto.randomUUID(),
            range: `(${index},${index})`,
            ...(child.boundary.label ? { title: child.boundary.label } : {}),
          }
        : null,
    )
    .filter((b): b is NonNullable<typeof b> => b !== null);
  if (boundaries.length) out.boundaries = boundaries;
  const style = xmindStyle(topic);
  if (style) out.style = style;
  return out;
}

export function toXmindContent(doc: MapDoc, title: string): string {
  const root = toXTopic(doc.root, 0);
  root.structureClass = xmindStructure(doc.layout);
  if (doc.floating.length) {
    root.children = {
      ...root.children,
      detached: doc.floating.map((f) => ({
        ...toXTopic(f, 1),
        position: { x: Math.round(f.x), y: Math.round(f.y) },
      })),
    };
  }
  return JSON.stringify([
    {
      id: crypto.randomUUID(),
      class: "sheet",
      title: title || doc.root.text || "Mapa",
      rootTopic: root,
      relationships: doc.relations.map((r) => ({
        id: r.id,
        end1Id: r.from,
        end2Id: r.to,
        ...(r.label ? { title: r.label } : {}),
      })),
    },
  ]);
}

function legacyXmindTopic(topic: Topic, depth: number): string {
  const attrs = [`id="${escapeXml(topic.id)}"`];
  if (topic.link) attrs.push(`xlink:href="${escapeXml(topic.link)}"`);
  if (topic.collapsed) attrs.push(`branch="folded"`);
  const parts = [`<title>${escapeXml(topic.text)}</title>`];
  const markers: string[] = [];
  if (topic.priority) markers.push(`priority-${topic.priority}`);
  if (topic.progress !== undefined)
    markers.push(PROGRESS_TO_XMIND[topic.progress]);
  if (markers.length)
    parts.push(
      `<marker-refs>${markers.map((m) => `<marker-ref marker-id="${m}"/>`).join("")}</marker-refs>`,
    );
  if (topic.labels?.length)
    parts.push(
      `<labels>${topic.labels.map((l) => `<label>${escapeXml(l)}</label>`).join("")}</labels>`,
    );
  if (topic.note)
    parts.push(`<notes><plain>${escapeXml(topic.note)}</plain></notes>`);
  if (topic.children.length && depth < MAX_DEPTH)
    parts.push(
      `<children><topics type="attached">${topic.children.map((c) => legacyXmindTopic(c, depth + 1)).join("")}</topics></children>`,
    );
  return `<topic ${attrs.join(" ")}>${parts.join("")}</topic>`;
}

function toLegacyXmind(doc: MapDoc, title: string): string {
  const relations = doc.relations
    .map(
      (r) =>
        `<relationship id="${escapeXml(r.id)}" end1="${escapeXml(r.from)}" end2="${escapeXml(r.to)}">${r.label ? `<title>${escapeXml(r.label)}</title>` : ""}</relationship>`,
    )
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>` +
    `<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:xlink="http://www.w3.org/1999/xlink" version="2.0">` +
    `<sheet id="${crypto.randomUUID()}">${legacyXmindTopic(doc.root, 0)}<title>${escapeXml(title || "Mapa")}</title>` +
    (relations ? `<relationships>${relations}</relationships>` : "") +
    `</sheet></xmap-content>`
  );
}

export function toXmindFile(doc: MapDoc, title: string): Uint8Array {
  return createZip({
    "content.json": toXmindContent(doc, title),
    "metadata.json": JSON.stringify({
      creator: { name: "Flowy", version: "1.0" },
    }),
    "manifest.json": JSON.stringify({
      "file-entries": { "content.json": {}, "metadata.json": {} },
    }),
    "content.xml": toLegacyXmind(doc, title),
    "META-INF/manifest.xml":
      `<?xml version="1.0" encoding="UTF-8" standalone="no"?>` +
      `<manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0">` +
      `<file-entry full-path="content.xml" media-type="text/xml"/>` +
      `<file-entry full-path="META-INF/" media-type=""/>` +
      `<file-entry full-path="META-INF/manifest.xml" media-type="text/xml"/>` +
      `</manifest>`,
  });
}

function fromXTopic(raw: Raw, depth: number): Raw {
  const out: Raw = {
    id: str(raw.id),
    text: str(raw.title) ?? "",
    children: [],
  };
  const children = isObject(raw.children) ? raw.children : {};
  if (Array.isArray(children.attached) && depth < MAX_DEPTH)
    out.children = children.attached
      .filter(isObject)
      .map((c) => fromXTopic(c, depth + 1));
  const notes = isObject(raw.notes) ? raw.notes : null;
  const plain = notes && isObject(notes.plain) ? str(notes.plain.content) : "";
  if (plain) out.note = plain;
  const href = str(raw.href);
  if (href && /^https?:/i.test(href)) out.link = href;
  if (Array.isArray(raw.labels)) out.labels = raw.labels;
  if (raw.branch === "folded") out.collapsed = true;
  if (Array.isArray(raw.markers)) {
    for (const m of raw.markers) {
      const id = isObject(m) ? str(m.markerId) : undefined;
      if (!id) continue;
      const priority = /^priority-(\d)$/.exec(id);
      if (priority) {
        out.priority = Math.min(3, Number(priority[1]));
        continue;
      }
      const progress = PROGRESS_MARKERS.find(([key]) => key === id);
      if (progress) {
        out.progress = progress[1];
        continue;
      }
      out.icon ??= iconFromXmind(id);
    }
  }
  const style = isObject(raw.style) ? raw.style.properties : null;
  if (isObject(style)) {
    out.style = {
      fill: style["svg:fill"],
      color: style["fo:color"],
      bold: style["fo:font-weight"] === "bold" || undefined,
      italic: style["fo:font-style"] === "italic" || undefined,
      strike:
        String(style["fo:text-decoration"] ?? "").includes("line-through") ||
        undefined,
      branch: style["line-color"],
      border: style["border-line-color"],
    };
  }
  // A boundary around a single child maps to that child; wider ones to us.
  if (Array.isArray(raw.boundaries)) {
    const kids = out.children as Raw[];
    for (const b of raw.boundaries) {
      if (!isObject(b)) continue;
      const range = /^\((\d+),(\d+)\)$/.exec(str(b.range) ?? "");
      const label = str(b.title);
      const target =
        range && range[1] === range[2] ? kids[Number(range[1])] : out;
      if (target) target.boundary = label ? { label } : {};
    }
  }
  return out;
}

function fromXmindJson(json: unknown, title: string): MapDoc | null {
  const sheets = Array.isArray(json) ? json : [json];
  const sheet = sheets.find(
    (s): s is Raw => isObject(s) && isObject(s.rootTopic),
  );
  if (!sheet || !isObject(sheet.rootTopic)) return null;
  const rootRaw = sheet.rootTopic;
  const root = fromXTopic(rootRaw, 0);
  const children = isObject(rootRaw.children) ? rootRaw.children : {};
  const floating = Array.isArray(children.detached)
    ? children.detached.filter(isObject).map((d) => {
        const pos = isObject(d.position) ? d.position : {};
        return {
          ...fromXTopic(d, 1),
          x: typeof pos.x === "number" ? pos.x : 0,
          y: typeof pos.y === "number" ? pos.y : 0,
        };
      })
    : [];
  const relations = Array.isArray(sheet.relationships)
    ? sheet.relationships.filter(isObject).map((r) => ({
        id: str(r.id),
        from: str(r.end1Id),
        to: str(r.end2Id),
        label: str(r.title),
      }))
    : [];
  return finish(
    {
      layout: layoutFromXmind(rootRaw.structureClass),
      theme: "flowy",
      root,
      floating,
      relations,
    },
    title,
  );
}

// ------------------------------------------------------- XML helpers

function parseXml(text: string): Document {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  if (xml.getElementsByTagName("parsererror").length)
    throw new Error("XML inválido.");
  return xml;
}

function childElements(el: Element, name: string): Element[] {
  return Array.from(el.children).filter(
    (c) => c.localName.toLowerCase() === name.toLowerCase(),
  );
}

function fromLegacyXmind(text: string, title: string): MapDoc | null {
  const xml = parseXml(text);
  const sheet = xml.getElementsByTagNameNS("*", "sheet")[0];
  const rootEl = sheet ? childElements(sheet, "topic")[0] : undefined;
  if (!sheet || !rootEl) return null;
  const read = (el: Element, depth: number): Raw => {
    const out: Raw = {
      id: el.getAttribute("id") ?? undefined,
      text: childElements(el, "title")[0]?.textContent ?? "",
      children: [],
    };
    const href = el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (href && /^https?:/i.test(href)) out.link = href;
    if (el.getAttribute("branch") === "folded") out.collapsed = true;
    const plain = childElements(el, "notes")[0]?.getElementsByTagNameNS(
      "*",
      "plain",
    )[0]?.textContent;
    if (plain) out.note = plain;
    const labels = childElements(el, "labels")[0];
    if (labels)
      out.labels = childElements(labels, "label").map((l) => l.textContent);
    for (const ref of Array.from(
      el.getElementsByTagNameNS("*", "marker-ref"),
    )) {
      if (ref.parentElement?.parentElement !== el) continue;
      const id = ref.getAttribute("marker-id") ?? "";
      const priority = /^priority-(\d)$/.exec(id);
      if (priority) out.priority = Math.min(3, Number(priority[1]));
      const progress = PROGRESS_MARKERS.find(([key]) => key === id);
      if (progress) out.progress = progress[1];
    }
    const kids = childElements(el, "children")[0];
    const attached = kids
      ? childElements(kids, "topics").find(
          (t) => t.getAttribute("type") === "attached",
        )
      : undefined;
    if (attached && depth < MAX_DEPTH)
      out.children = childElements(attached, "topic").map((c) =>
        read(c, depth + 1),
      );
    return out;
  };
  const relations = Array.from(
    sheet.getElementsByTagNameNS("*", "relationship"),
  ).map((r) => ({
    id: r.getAttribute("id") ?? undefined,
    from: r.getAttribute("end1") ?? "",
    to: r.getAttribute("end2") ?? "",
    label: childElements(r, "title")[0]?.textContent ?? undefined,
  }));
  return finish(
    {
      layout: layoutFromXmind(rootEl.getAttribute("structure-class")),
      theme: "flowy",
      root: read(rootEl, 0),
      floating: [],
      relations,
    },
    title,
  );
}

// ------------------------------------------------------------ FreeMind

function freeMindNode(
  topic: Topic,
  depth: number,
  side: string | null,
  relations: Relation[],
): string {
  const attrs = [
    `TEXT="${escapeXml(topic.text)}"`,
    `ID="ID_${escapeXml(topic.id)}"`,
  ];
  if (side) attrs.push(`POSITION="${side}"`);
  if (topic.collapsed) attrs.push(`FOLDED="true"`);
  if (topic.link) attrs.push(`LINK="${escapeXml(topic.link)}"`);
  if (topic.style?.color) attrs.push(`COLOR="${topic.style.color}"`);
  if (topic.style?.fill) attrs.push(`BACKGROUND_COLOR="${topic.style.fill}"`);
  const inner: string[] = [];
  if (topic.style?.bold || topic.style?.italic)
    inner.push(
      `<font NAME="SansSerif" SIZE="12"${topic.style.bold ? ` BOLD="true"` : ""}${topic.style.italic ? ` ITALIC="true"` : ""}/>`,
    );
  if (topic.priority) inner.push(`<icon BUILTIN="full-${topic.priority}"/>`);
  const icon = ICONS.find(([emoji]) => emoji === topic.icon)?.[2];
  if (icon) inner.push(`<icon BUILTIN="${icon}"/>`);
  if (topic.done) inner.push(`<icon BUILTIN="button_ok"/>`);
  if (topic.note)
    inner.push(
      `<richcontent TYPE="NOTE"><html><head/><body>${topic.note
        .split(/\r?\n/)
        .map((line) => `<p>${escapeXml(line)}</p>`)
        .join("")}</body></html></richcontent>`,
    );
  for (const r of relations.filter((rel) => rel.from === topic.id))
    inner.push(
      `<arrowlink DESTINATION="ID_${escapeXml(r.to)}" ENDARROW="Default" STARTARROW="None"/>`,
    );
  if (depth < MAX_DEPTH)
    topic.children.forEach((c, i) =>
      inner.push(
        freeMindNode(
          c,
          depth + 1,
          depth === 0 ? (i % 2 === 0 ? "right" : "left") : null,
          relations,
        ),
      ),
    );
  return `<node ${attrs.join(" ")}>${inner.join("")}</node>`;
}

export function toFreeMind(doc: MapDoc): string {
  return `<map version="1.0.1">${freeMindNode(doc.root, 0, null, doc.relations)}</map>\n`;
}

function fromFreeMind(text: string, title: string): MapDoc | null {
  const xml = parseXml(text);
  const map = xml.documentElement;
  const rootEl = childElements(map, "node")[0];
  if (!rootEl) return null;
  const relations: Raw[] = [];
  const read = (el: Element, depth: number): Raw => {
    const id = (el.getAttribute("ID") ?? "").replace(/^ID_/, "") || undefined;
    const richText = childElements(el, "richcontent").find(
      (r) => (r.getAttribute("TYPE") ?? "NODE") === "NODE",
    );
    const out: Raw = {
      id,
      text: el.getAttribute("TEXT") ?? richText?.textContent?.trim() ?? "",
      children: [],
    };
    const link = el.getAttribute("LINK");
    if (link && /^https?:/i.test(link)) out.link = link;
    if (el.getAttribute("FOLDED") === "true") out.collapsed = true;
    const style: Raw = {
      color: el.getAttribute("COLOR") ?? undefined,
      fill: el.getAttribute("BACKGROUND_COLOR") ?? undefined,
    };
    const font = childElements(el, "font")[0];
    if (font?.getAttribute("BOLD") === "true") style.bold = true;
    if (font?.getAttribute("ITALIC") === "true") style.italic = true;
    out.style = style;
    for (const icon of childElements(el, "icon")) {
      const name = icon.getAttribute("BUILTIN") ?? "";
      const full = /^full-(\d)$/.exec(name);
      if (full) out.priority = Math.min(3, Number(full[1]));
      else if (name === "button_ok") out.done = true;
      else out.icon ??= ICONS.find(([, , fm]) => fm === name)?.[0];
    }
    const note = childElements(el, "richcontent").find(
      (r) => r.getAttribute("TYPE") === "NOTE",
    );
    if (note) {
      const paragraphs = Array.from(note.getElementsByTagName("p")).map(
        (p) => p.textContent?.trim() ?? "",
      );
      out.note = paragraphs.length
        ? paragraphs.join("\n")
        : (note.textContent ?? "").trim();
    }
    for (const arrow of childElements(el, "arrowlink")) {
      const to = (arrow.getAttribute("DESTINATION") ?? "").replace(/^ID_/, "");
      if (id && to) relations.push({ from: id, to });
    }
    if (depth < MAX_DEPTH)
      out.children = childElements(el, "node").map((c) => read(c, depth + 1));
    return out;
  };
  return finish(
    {
      layout: "mindmap",
      theme: "flowy",
      root: read(rootEl, 0),
      floating: [],
      relations,
    },
    title,
  );
}

// ---------------------------------------------------------------- OPML

function opmlOutline(topic: Topic, depth: number): string {
  const note = topic.note ? ` _note="${escapeXml(topic.note)}"` : "";
  const kids =
    depth < MAX_DEPTH
      ? topic.children.map((c) => opmlOutline(c, depth + 1)).join("")
      : "";
  return kids
    ? `<outline text="${escapeXml(topic.text)}"${note}>${kids}</outline>`
    : `<outline text="${escapeXml(topic.text)}"${note}/>`;
}

export function toOpml(doc: MapDoc, title: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0"><head><title>${escapeXml(title)}</title></head><body>` +
    opmlOutline(doc.root, 0) +
    doc.floating.map((f) => opmlOutline(f, 0)).join("") +
    `</body></opml>\n`
  );
}

function fromOpml(text: string, title: string): MapDoc | null {
  const xml = parseXml(text);
  const body = xml.getElementsByTagName("body")[0];
  if (!body) return null;
  const read = (el: Element, depth: number): Raw => ({
    text: el.getAttribute("text") ?? el.getAttribute("title") ?? "",
    note: el.getAttribute("_note") ?? undefined,
    children:
      depth < MAX_DEPTH
        ? childElements(el, "outline").map((c) => read(c, depth + 1))
        : [],
  });
  const tops = childElements(body, "outline").map((o) => read(o, 0));
  return fromTopLevel(tops, title);
}

// ------------------------------------------------------- text / generic

export function toIndentedText(doc: MapDoc): string {
  const lines: string[] = [];
  const write = (t: Topic, depth: number) => {
    lines.push(`${"\t".repeat(depth)}${t.text.replace(/\s*\n\s*/g, " ")}`);
    t.children.forEach((c) => write(c, depth + 1));
  };
  write(doc.root, 0);
  doc.floating.forEach((f) => write(f, 0));
  return lines.join("\n") + "\n";
}

function fromTopLevel(tops: Raw[], title: string): MapDoc {
  const root: Raw =
    tops.length === 1 && tops[0]
      ? tops[0]
      : { text: title || "Ideia central", children: tops };
  return finish(
    { layout: "mindmap", theme: "flowy", root, floating: [], relations: [] },
    title,
  );
}

/** Any JSON tree with title/text/topic + children (MindMeister and others). */
function genericNode(raw: Raw, depth: number): Raw {
  const kids = isObject(raw.children)
    ? (raw.children.attached ?? raw.children.topics)
    : raw.children;
  const notes = raw.note ?? raw.notes;
  const out: Raw = {
    text:
      str(raw.title) ?? str(raw.text) ?? str(raw.topic) ?? str(raw.name) ?? "",
    children:
      Array.isArray(kids) && depth < MAX_DEPTH
        ? kids.filter(isObject).map((c) => genericNode(c, depth + 1))
        : [],
  };
  if (typeof notes === "string" && notes) out.note = notes;
  const link = str(raw.link) ?? str(raw.href) ?? str(raw.url);
  if (link && /^https?:/i.test(link)) out.link = link;
  if (raw.closed === true || raw.collapsed === true) out.collapsed = true;
  return out;
}

function findTree(json: unknown, depth = 0): Raw | null {
  if (depth > 4 || !isObject(json)) return null;
  for (const key of ["root", "rootTopic", "nodeData", "map"]) {
    const value = json[key];
    if (isObject(value) && (value.children || value.title || value.text))
      return value;
    const nested = findTree(value, depth + 1);
    if (nested) return nested;
  }
  return json.children ? json : null;
}

function fromJson(text: string, title: string): MapDoc | null {
  const json: unknown = JSON.parse(text);
  if (isObject(json) && json.version === 2 && isObject(json.root))
    return parseMapData(text, title);
  if (isObject(json) && isObject(json.nodeData))
    return parseMapData(text, title);
  if (Array.isArray(json) && json.some((s) => isObject(s) && s.rootTopic))
    return fromXmindJson(json, title);
  const tree = findTree(json);
  return tree ? fromTopLevel([genericNode(tree, 0)], title) : null;
}

function fromText(text: string, title: string): MapDoc | null {
  const topics = fromOutline(text.replace(/^#+\s*/gm, "- "));
  if (!topics.length) return null;
  const toRaw = (t: Topic): Raw => JSON.parse(JSON.stringify(t)) as Raw;
  return fromTopLevel(topics.map(toRaw), title);
}

export const IMPORT_ACCEPT =
  ".xmind,.mind,.mm,.opml,.json,.md,.markdown,.txt,application/json,text/plain,text/markdown";

/** Reads a file exported by XMind, MindMeister, FreeMind, OPML tools or Flowy. */
export async function importMapFile(
  name: string,
  bytes: Uint8Array,
): Promise<MapDoc> {
  const title = name.replace(/\.[^.]+$/, "");
  const ext = /\.([^.]+)$/.exec(name.toLowerCase())?.[1] ?? "";
  let doc: MapDoc | null = null;
  if (isZip(bytes)) {
    const files = await readZipText(bytes, (n) =>
      /(^|\/)(content\.json|content\.xml|map\.json)$/i.test(n),
    );
    const contentJson = files["content.json"];
    const contentXml = files["content.xml"];
    const mapJson = Object.entries(files).find(([n]) =>
      /map\.json$/i.test(n),
    )?.[1];
    if (contentJson) doc = fromXmindJson(JSON.parse(contentJson), title);
    if (!doc && contentXml) doc = fromLegacyXmind(contentXml, title);
    if (!doc && mapJson) doc = fromJson(mapJson, title);
  } else {
    const text = new TextDecoder().decode(bytes).replace(/^﻿/, "");
    const trimmed = text.trimStart();
    if (ext === "json" || trimmed.startsWith("{") || trimmed.startsWith("["))
      doc = fromJson(text, title);
    else if (ext === "opml" || /<opml[\s>]/i.test(trimmed))
      doc = fromOpml(text, title);
    else if (ext === "mm" || /^<map[\s>]/i.test(trimmed))
      doc = fromFreeMind(text, title);
    else doc = fromText(text, title);
  }
  if (!doc) throw new Error("Formato não reconhecido.");
  return doc;
}

/** Topics of a map in reading order, for search and presentations. */
export function topicsInOrder(doc: MapDoc): Topic[] {
  const out: Topic[] = [];
  walk(doc.root, (t) => out.push(t));
  doc.floating.forEach((f) => walk(f, (t) => out.push(t)));
  return out;
}

export function toFlowyJson(doc: MapDoc): string {
  return serializeMap(doc);
}
