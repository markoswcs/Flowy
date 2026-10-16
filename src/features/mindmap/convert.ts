import { createMap, TEMPLATE_LAYOUTS } from "@/features/mindmap/model";
import type {
  LayoutKind,
  MapDoc,
  Relation,
  TemplateId,
  ThemeId,
  Topic,
  TopicShape,
  TopicStyle,
} from "@/features/mindmap/types";

const MAX_DEPTH = 200;
const LAYOUTS: LayoutKind[] = [
  "mindmap",
  "logic-right",
  "logic-left",
  "org",
  "tree",
  "timeline",
  "flow",
];
const THEME_IDS: ThemeId[] = [
  "flowy",
  "classic",
  "ocean",
  "sunset",
  "forest",
  "mono",
];
const SHAPES: TopicShape[] = [
  "rounded",
  "rect",
  "pill",
  "ellipse",
  "diamond",
  "underline",
  "none",
];
const RELATION_STYLES: NonNullable<Relation["style"]>[] = [
  "curve",
  "straight",
  "dashed",
];

export const TEMPLATES: {
  id: TemplateId;
  label: string;
  description: string;
  layout: LayoutKind;
}[] = [
  {
    id: "blank",
    label: "Em branco",
    description: "Comece do zero com um tema central e três ideias.",
    layout: TEMPLATE_LAYOUTS.blank,
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    description: "Explore problema, ideias, recursos e próximos passos.",
    layout: TEMPLATE_LAYOUTS.brainstorm,
  },
  {
    id: "project",
    label: "Projeto",
    description: "Objetivo, escopo, prazos, equipe e riscos em um só lugar.",
    layout: TEMPLATE_LAYOUTS.project,
  },
  {
    id: "meeting",
    label: "Reunião",
    description: "Pauta, decisões e próximos passos com checklist.",
    layout: TEMPLATE_LAYOUTS.meeting,
  },
  {
    id: "study",
    label: "Estudo",
    description: "Organize conceitos, exemplos, dúvidas e revisão.",
    layout: TEMPLATE_LAYOUTS.study,
  },
  {
    id: "swot",
    label: "Análise SWOT",
    description: "Forças, fraquezas, oportunidades e ameaças coloridas.",
    layout: TEMPLATE_LAYOUTS.swot,
  },
  {
    id: "flowchart",
    label: "Fluxograma",
    description: "Fluxo de cima para baixo com etapas e decisões.",
    layout: TEMPLATE_LAYOUTS.flowchart,
  },
  {
    id: "org",
    label: "Organograma",
    description: "Estrutura hierárquica de áreas e pessoas.",
    layout: TEMPLATE_LAYOUTS.org,
  },
];

type Raw = Record<string, unknown>;

function isObject(v: unknown): v is Raw {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function newId(used: Set<string>, candidate: unknown): string {
  let id =
    typeof candidate === "string" && candidate !== ""
      ? candidate
      : crypto.randomUUID();
  while (used.has(id)) id = crypto.randomUUID();
  used.add(id);
  return id;
}

function cleanStyle(raw: unknown): TopicStyle | undefined {
  if (!isObject(raw)) return undefined;
  const style: TopicStyle = {};
  const fill = str(raw.fill);
  const color = str(raw.color);
  const branch = str(raw.branch);
  if (fill) style.fill = fill;
  if (color) style.color = color;
  if (branch) style.branch = branch;
  if (
    typeof raw.shape === "string" &&
    (SHAPES as string[]).includes(raw.shape)
  ) {
    style.shape = raw.shape as TopicShape;
  }
  if (typeof raw.bold === "boolean") style.bold = raw.bold;
  return Object.keys(style).length > 0 ? style : undefined;
}

function cleanTopic(raw: unknown, used: Set<string>, depth: number): Topic {
  const r = isObject(raw) ? raw : {};
  const text =
    typeof r.text === "string"
      ? r.text
      : typeof r.text === "number"
        ? String(r.text)
        : "";
  const topic: Topic = { id: newId(used, r.id), text, children: [] };
  if (depth < MAX_DEPTH && Array.isArray(r.children)) {
    topic.children = r.children
      .filter(isObject)
      .map((c) => cleanTopic(c, used, depth + 1));
  }
  if (r.collapsed === true) topic.collapsed = true;
  const style = cleanStyle(r.style);
  if (style) topic.style = style;
  if (typeof r.icon === "string" && r.icon) topic.icon = r.icon;
  if (
    r.priority === 0 ||
    r.priority === 1 ||
    r.priority === 2 ||
    r.priority === 3
  )
    topic.priority = r.priority;
  if (typeof r.done === "boolean") topic.done = r.done;
  if (typeof r.note === "string" && r.note) topic.note = r.note;
  if (typeof r.link === "string" && r.link) topic.link = r.link;
  const offset = r.offset as { x?: unknown; y?: unknown } | undefined;
  if (
    offset &&
    typeof offset.x === "number" &&
    typeof offset.y === "number" &&
    Number.isFinite(offset.x) &&
    Number.isFinite(offset.y) &&
    (offset.x !== 0 || offset.y !== 0)
  ) {
    topic.offset = { x: offset.x, y: offset.y };
  }
  return topic;
}

function idsOf(topic: Topic, into: Set<string>) {
  into.add(topic.id);
  topic.children.forEach((c) => idsOf(c, into));
}

function cleanRelations(
  raw: unknown,
  alive: Set<string>,
  used: Set<string>,
): Relation[] {
  if (!Array.isArray(raw)) return [];
  const out: Relation[] = [];
  for (const item of raw) {
    if (!isObject(item)) continue;
    const from = str(item.from);
    const to = str(item.to);
    if (!from || !to || !alive.has(from) || !alive.has(to)) continue;
    const rel: Relation = { id: newId(used, item.id), from, to };
    const label = str(item.label);
    if (label) rel.label = label;
    if (
      typeof item.style === "string" &&
      (RELATION_STYLES as string[]).includes(item.style)
    ) {
      rel.style = item.style as Relation["style"];
    }
    out.push(rel);
  }
  return out;
}

function parseV2(raw: Raw): MapDoc {
  const used = new Set<string>();
  const root = cleanTopic(raw.root, used, 0);
  const floating: MapDoc["floating"] = [];
  if (Array.isArray(raw.floating)) {
    for (const item of raw.floating) {
      if (!isObject(item)) continue;
      const topic = cleanTopic(item, used, 0);
      const x =
        typeof item.x === "number" && Number.isFinite(item.x) ? item.x : 0;
      const y =
        typeof item.y === "number" && Number.isFinite(item.y) ? item.y : 0;
      floating.push({ ...topic, x, y });
    }
  }
  const alive = new Set<string>();
  idsOf(root, alive);
  floating.forEach((f) => idsOf(f, alive));
  const layout = LAYOUTS.includes(raw.layout as LayoutKind)
    ? (raw.layout as LayoutKind)
    : "mindmap";
  const theme = THEME_IDS.includes(raw.theme as ThemeId)
    ? (raw.theme as ThemeId)
    : "flowy";
  return {
    version: 2,
    layout,
    theme,
    root,
    floating,
    relations: cleanRelations(raw.relations, alive, new Set()),
  };
}

function elixirTopic(raw: Raw, used: Set<string>, depth: number): Topic {
  const topic: Topic = {
    id: newId(used, raw.id),
    text: str(raw.topic) ?? "",
    children: [],
  };
  if (depth < MAX_DEPTH && Array.isArray(raw.children)) {
    topic.children = raw.children
      .filter(isObject)
      .map((c) => elixirTopic(c, used, depth + 1));
  }
  if (raw.expanded === false) topic.collapsed = true;
  if (isObject(raw.style)) {
    const style: TopicStyle = {};
    const background = str(raw.style.background);
    const color = str(raw.style.color);
    if (background) style.fill = background;
    if (color) style.color = color;
    const weight = raw.style.fontWeight;
    if (
      weight === "bold" ||
      (typeof weight === "string" && Number(weight) >= 600) ||
      (typeof weight === "number" && weight >= 600)
    ) {
      style.bold = true;
    }
    if (Object.keys(style).length > 0) topic.style = style;
  }
  if (Array.isArray(raw.icons)) {
    const icon = raw.icons.find(
      (i): i is string => typeof i === "string" && i !== "",
    );
    if (icon) topic.icon = icon;
  }
  const link = str(raw.hyperLink);
  if (link) topic.link = link;
  const note = str(raw.note);
  if (note) topic.note = note;
  return topic;
}

function parseElixir(raw: Raw, nodeData: Raw): MapDoc {
  const used = new Set<string>();
  const root = elixirTopic(nodeData, used, 0);
  const alive = new Set<string>();
  idsOf(root, alive);
  const relations: Relation[] = [];
  if (Array.isArray(raw.arrows)) {
    const relIds = new Set<string>();
    for (const a of raw.arrows) {
      if (!isObject(a)) continue;
      const from = str(a.from);
      const to = str(a.to);
      if (!from || !to || !alive.has(from) || !alive.has(to)) continue;
      const rel: Relation = {
        id: newId(relIds, a.id),
        from,
        to,
        style: "curve",
      };
      const label = str(a.label);
      if (label) rel.label = label;
      relations.push(rel);
    }
  }
  const layout: LayoutKind =
    raw.direction === 0
      ? "logic-left"
      : raw.direction === 1
        ? "logic-right"
        : "mindmap";
  return { version: 2, layout, theme: "flowy", root, floating: [], relations };
}

export function parseMapData(raw: string | null, title: string): MapDoc {
  if (!raw || raw.trim() === "") return createMap(title, "blank");
  try {
    const data: unknown = JSON.parse(raw);
    if (isObject(data)) {
      if (isObject(data.root)) return parseV2(data);
      if (isObject(data.nodeData)) return parseElixir(data, data.nodeData);
    }
  } catch {
    // fall through to a blank map
  }
  return createMap(title, "blank");
}

export function serializeMap(doc: MapDoc): string {
  return JSON.stringify(doc);
}
