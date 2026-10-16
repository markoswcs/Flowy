import type {
  LayoutKind,
  MapDoc,
  MapHistory,
  PlacedTopic,
  Relation,
  TemplateId,
  ThemeId,
  Topic,
} from "@/features/mindmap/types";

type Floating = MapDoc["floating"][number];
type TopicPatch = Partial<Omit<Topic, "id" | "children">>;

const HISTORY_LIMIT = 100;

export const TEMPLATE_LAYOUTS: Record<TemplateId, LayoutKind> = {
  blank: "mindmap",
  brainstorm: "mindmap",
  project: "logic-right",
  meeting: "logic-right",
  study: "mindmap",
  swot: "mindmap",
  flowchart: "flow",
  org: "org",
};

export function createTopic(text = ""): Topic {
  return { id: crypto.randomUUID(), text, children: [] };
}

function node(
  text: string,
  children: Topic[] = [],
  extra: TopicPatch = {},
): Topic {
  return { ...createTopic(text), ...extra, children };
}

function leaves(texts: string[], extra: TopicPatch = {}): Topic[] {
  return texts.map((t) => node(t, [], extra));
}

function colored(text: string, color: string, children: Topic[] = []): Topic {
  return node(text, children, {
    style: { fill: color, color: "#FFFFFF", branch: color },
  });
}

function templateChildren(template: TemplateId): Topic[] {
  switch (template) {
    case "brainstorm":
      return [
        node("Problema", leaves(["Contexto", "Quem é afetado?"])),
        node("Ideias", leaves(["Ideia A", "Ideia B", "Ideia C"])),
        node("Recursos", leaves(["Pessoas", "Orçamento", "Ferramentas"])),
        node("Próximos passos", leaves(["Validar", "Testar"])),
      ];
    case "project":
      return [
        node(
          "Objetivo",
          leaves(["Resultado esperado", "Indicador de sucesso"]),
        ),
        node("Escopo", leaves(["Entregas", "Fora do escopo"])),
        node("Prazos", leaves(["Início", "Marcos", "Entrega final"])),
        node("Equipe", leaves(["Responsável", "Colaboradores"])),
        node("Riscos", leaves(["Risco 1", "Plano de mitigação"])),
      ];
    case "meeting":
      return [
        node("Pauta", leaves(["Tópico 1", "Tópico 2"], { done: false })),
        node("Decisões", leaves(["Decisão 1"], { done: false })),
        node(
          "Próximos passos",
          leaves(["Tarefa 1", "Tarefa 2", "Tarefa 3"], { done: false }),
        ),
      ];
    case "study":
      return [
        node("Conceitos-chave", leaves(["Definição", "Fórmulas"])),
        node("Exemplos", leaves(["Exemplo 1", "Exemplo 2"])),
        node("Dúvidas", leaves(["Pergunta 1"])),
        node("Revisão", leaves(["Resumo", "Exercícios"])),
      ];
    case "swot":
      return [
        colored(
          "Forças",
          "#047857",
          leaves(["Ponto forte 1", "Ponto forte 2"]),
        ),
        colored(
          "Fraquezas",
          "#B91C1C",
          leaves(["Ponto fraco 1", "Ponto fraco 2"]),
        ),
        colored(
          "Oportunidades",
          "#1D4ED8",
          leaves(["Oportunidade 1", "Oportunidade 2"]),
        ),
        colored("Ameaças", "#B45309", leaves(["Ameaça 1", "Ameaça 2"])),
      ];
    case "org":
      return [
        node("Área 1", leaves(["Pessoa 1", "Pessoa 2"])),
        node("Área 2", leaves(["Pessoa 3", "Pessoa 4"])),
        node("Área 3", leaves(["Pessoa 5", "Pessoa 6"])),
      ];
    default:
      return leaves(["Ideia 1", "Ideia 2", "Ideia 3"]);
  }
}

export function createMap(
  title: string,
  template: TemplateId = "blank",
): MapDoc {
  const layout = TEMPLATE_LAYOUTS[template] ?? "mindmap";
  let root: Topic;
  if (template === "flowchart") {
    const decision = node("Decisão?", [node("Sim"), node("Não")], {
      style: { shape: "diamond" },
    });
    const step = node("Etapa", [decision], { style: { shape: "rect" } });
    root = node("Início", [step], { style: { shape: "pill" } });
  } else {
    root = node(title, templateChildren(template));
  }
  return {
    version: 2,
    layout,
    theme: "flowy",
    root,
    floating: [],
    relations: [],
  };
}

function roots(doc: MapDoc): Topic[] {
  return [doc.root, ...doc.floating];
}

function findIn(topic: Topic, id: string): Topic | null {
  if (topic.id === id) return topic;
  for (const child of topic.children) {
    const found = findIn(child, id);
    if (found) return found;
  }
  return null;
}

export function findTopic(doc: MapDoc, id: string): Topic | null {
  for (const r of roots(doc)) {
    const found = findIn(r, id);
    if (found) return found;
  }
  return null;
}

function findParentIn(topic: Topic, id: string): Topic | null {
  for (const child of topic.children) {
    if (child.id === id) return topic;
    const found = findParentIn(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(doc: MapDoc, id: string): Topic | null {
  for (const r of roots(doc)) {
    const found = findParentIn(r, id);
    if (found) return found;
  }
  return null;
}

function pathIn(topic: Topic, id: string): Topic[] | null {
  if (topic.id === id) return [topic];
  for (const child of topic.children) {
    const sub = pathIn(child, id);
    if (sub) return [topic, ...sub];
  }
  return null;
}

export function pathTo(doc: MapDoc, id: string): Topic[] {
  for (const r of roots(doc)) {
    const p = pathIn(r, id);
    if (p) return p;
  }
  return [];
}

export function flatten(doc: MapDoc): Topic[] {
  const out: Topic[] = [];
  const walk = (t: Topic) => {
    out.push(t);
    t.children.forEach(walk);
  };
  roots(doc).forEach(walk);
  return out;
}

export function visibleTopics(doc: MapDoc): Topic[] {
  const out: Topic[] = [];
  const walk = (t: Topic) => {
    out.push(t);
    if (!t.collapsed) t.children.forEach(walk);
  };
  roots(doc).forEach(walk);
  return out;
}

function editIn<T extends Topic>(
  top: T,
  id: string,
  fn: (t: Topic) => Topic,
): T | null {
  if (top.id === id) return { ...top, ...fn(top) };
  for (let i = 0; i < top.children.length; i++) {
    const child = top.children[i];
    if (!child) continue;
    const next = editIn(child, id, fn);
    if (next) {
      const children = top.children.slice();
      children[i] = next;
      return { ...top, children };
    }
  }
  return null;
}

function edit(doc: MapDoc, id: string, fn: (t: Topic) => Topic): MapDoc {
  const root = editIn(doc.root, id, fn);
  if (root) return { ...doc, root };
  for (let i = 0; i < doc.floating.length; i++) {
    const f = doc.floating[i];
    if (!f) continue;
    const next = editIn(f, id, fn);
    if (next) {
      const floating = doc.floating.slice();
      floating[i] = next;
      return { ...doc, floating };
    }
  }
  return doc;
}

function stripPosition(t: Topic): Topic {
  const copy = { ...t } as Topic & { x?: number; y?: number };
  delete copy.x;
  delete copy.y;
  return copy;
}

function removeFrom(
  children: Topic[],
  id: string,
): { children: Topic[]; removed: Topic | null } {
  const idx = children.findIndex((c) => c.id === id);
  if (idx >= 0) {
    return {
      children: children.filter((_, i) => i !== idx),
      removed: children[idx] ?? null,
    };
  }
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!child) continue;
    const res = removeFrom(child.children, id);
    if (res.removed) {
      const next = children.slice();
      next[i] = { ...child, children: res.children };
      return { children: next, removed: res.removed };
    }
  }
  return { children, removed: null };
}

export function addChild(
  doc: MapDoc,
  parentId: string,
  text = "",
): { doc: MapDoc; id: string } {
  const topic = createTopic(text);
  const next = edit(doc, parentId, (p) => ({
    ...p,
    collapsed: false,
    children: [...p.children, topic],
  }));
  return { doc: next, id: topic.id };
}

export function addSibling(
  doc: MapDoc,
  id: string,
  text = "",
  before = false,
): { doc: MapDoc; id: string } {
  const parent = findParent(doc, id);
  if (!parent) return addChild(doc, id, text);
  const topic = createTopic(text);
  const next = edit(doc, parent.id, (p) => {
    const idx = p.children.findIndex((c) => c.id === id);
    const at = idx < 0 ? p.children.length : before ? idx : idx + 1;
    const children = p.children.slice();
    children.splice(at, 0, topic);
    return { ...p, children };
  });
  return { doc: next, id: topic.id };
}

export function addParent(
  doc: MapDoc,
  id: string,
  text = "",
): { doc: MapDoc; id: string } {
  const parent = findParent(doc, id);
  const target = findTopic(doc, id);
  if (!parent || !target) return { doc, id };
  const wrapper = createTopic(text);
  const next = edit(doc, parent.id, (p) => ({
    ...p,
    children: p.children.map((c) =>
      c.id === id ? { ...wrapper, children: [c] } : c,
    ),
  }));
  return { doc: next, id: wrapper.id };
}

export function updateTopic(
  doc: MapDoc,
  id: string,
  patch: TopicPatch,
): MapDoc {
  return edit(doc, id, (t) => ({ ...t, ...patch }));
}

function collectIds(t: Topic, into: Set<string>) {
  into.add(t.id);
  t.children.forEach((c) => collectIds(c, into));
}

export function deleteTopics(doc: MapDoc, ids: string[]): MapDoc {
  const targets = new Set(
    ids.filter((id) => id !== doc.root.id && findTopic(doc, id)),
  );
  if (targets.size === 0) return doc;
  const prune = (list: Topic[]): Topic[] =>
    list
      .filter((c) => !targets.has(c.id))
      .map((c) => ({ ...c, children: prune(c.children) }));
  const root: Topic = { ...doc.root, children: prune(doc.root.children) };
  const floating: Floating[] = doc.floating
    .filter((f) => !targets.has(f.id))
    .map((f) => ({ ...f, children: prune(f.children) }));
  const alive = new Set<string>();
  collectIds(root, alive);
  floating.forEach((f) => collectIds(f, alive));
  const relations = doc.relations.filter(
    (r) => alive.has(r.from) && alive.has(r.to),
  );
  return { ...doc, root, floating, relations };
}

export function moveTopic(
  doc: MapDoc,
  id: string,
  newParentId: string,
  index: number,
): MapDoc {
  if (id === doc.root.id) return doc;
  const moving = findTopic(doc, id);
  if (!moving || !findTopic(doc, newParentId)) return doc;
  if (findIn(moving, newParentId)) return doc;

  let removed: Topic | null = null;
  let root = doc.root;
  let floating = doc.floating;
  const fromRoot = removeFrom(doc.root.children, id);
  if (fromRoot.removed) {
    removed = fromRoot.removed;
    root = { ...doc.root, children: fromRoot.children };
  } else if (doc.floating.some((f) => f.id === id)) {
    removed = moving;
    floating = doc.floating.filter((f) => f.id !== id);
  } else {
    const next: Floating[] = [];
    for (const f of doc.floating) {
      const res: { children: Topic[]; removed: Topic | null } = removed
        ? { children: f.children, removed: null }
        : removeFrom(f.children, id);
      if (res.removed) removed = res.removed;
      next.push(res.removed ? { ...f, children: res.children } : f);
    }
    floating = next;
  }
  if (!removed) return doc;
  const moved = stripPosition(removed);
  return edit({ ...doc, root, floating }, newParentId, (p) => {
    const children = p.children.slice();
    const at = Math.max(
      0,
      Math.min(
        Number.isFinite(index) ? Math.trunc(index) : children.length,
        children.length,
      ),
    );
    children.splice(at, 0, moved);
    return { ...p, collapsed: false, children };
  });
}

export function reorder(doc: MapDoc, id: string, delta: -1 | 1): MapDoc {
  const parent = findParent(doc, id);
  if (!parent) return doc;
  const idx = parent.children.findIndex((c) => c.id === id);
  const to = idx + delta;
  if (idx < 0 || to < 0 || to >= parent.children.length) return doc;
  return edit(doc, parent.id, (p) => {
    const children = p.children.slice();
    const a = children[idx];
    const b = children[to];
    if (!a || !b) return p;
    children[idx] = b;
    children[to] = a;
    return { ...p, children };
  });
}

export function toggleCollapse(
  doc: MapDoc,
  id: string,
  collapsed?: boolean,
): MapDoc {
  return edit(doc, id, (t) => ({ ...t, collapsed: collapsed ?? !t.collapsed }));
}

export function setAllCollapsed(doc: MapDoc, collapsed: boolean): MapDoc {
  const apply = <T extends Topic>(t: T, isRoot: boolean): T => {
    const children = t.children.map((c) => apply(c, false));
    const next: T = { ...t, children };
    if (!isRoot && children.length > 0) next.collapsed = collapsed;
    return next;
  };
  return {
    ...doc,
    root: apply(doc.root, true),
    floating: doc.floating.map((f) => apply(f, false)),
  };
}

export function addRelation(
  doc: MapDoc,
  from: string,
  to: string,
  label?: string,
): { doc: MapDoc; id: string } {
  const relation: Relation = { id: crypto.randomUUID(), from, to };
  if (label !== undefined) relation.label = label;
  return {
    doc: { ...doc, relations: [...doc.relations, relation] },
    id: relation.id,
  };
}

export function updateRelation(
  doc: MapDoc,
  id: string,
  patch: Partial<Omit<Relation, "id">>,
): MapDoc {
  return {
    ...doc,
    relations: doc.relations.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  };
}

export function deleteRelation(doc: MapDoc, id: string): MapDoc {
  return { ...doc, relations: doc.relations.filter((r) => r.id !== id) };
}

/** Drops every manual position so the automatic layout takes over again. */
export function clearOffsets(doc: MapDoc): MapDoc {
  let changed = false;
  const strip = (topic: Topic): Topic => {
    const children = topic.children.map(strip);
    if (!topic.offset && children.every((c, i) => c === topic.children[i])) {
      return topic;
    }
    changed = true;
    const next: Topic = { ...topic, children };
    delete next.offset;
    return next;
  };
  const root = strip(doc.root);
  return changed ? { ...doc, root } : doc;
}

export function setLayout(doc: MapDoc, layout: LayoutKind): MapDoc {
  // Manual nudges belong to one arrangement; a new layout starts clean.
  return doc.layout === layout ? doc : { ...clearOffsets(doc), layout };
}

export function setTheme(doc: MapDoc, theme: ThemeId): MapDoc {
  return doc.theme === theme ? doc : { ...doc, theme };
}

type Dir = "up" | "down" | "left" | "right";

function centre(p: PlacedTopic) {
  return { x: p.x + p.width / 2, y: p.y + p.height / 2 };
}

function pickChild(
  positions: Map<string, PlacedTopic>,
  parent: PlacedTopic,
  accept: (c: PlacedTopic) => boolean,
  axis: "x" | "y",
): string | null {
  const pc = centre(parent);
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of positions.values()) {
    if (c.parentId !== parent.id || !accept(c)) continue;
    const dist = Math.abs(centre(c)[axis] - pc[axis]);
    if (dist < bestDist) {
      bestDist = dist;
      best = c.id;
    }
  }
  return best;
}

function relationalNeighbor(
  layout: LayoutKind,
  cur: PlacedTopic,
  dir: Dir,
  positions: Map<string, PlacedTopic>,
): string | null {
  const toParent =
    cur.parentId && positions.has(cur.parentId) ? cur.parentId : null;
  const horizontal = (away: "left" | "right") => {
    if (dir === away) return pickChild(positions, cur, () => true, "y");
    if (dir === (away === "right" ? "left" : "right")) return toParent;
    return null;
  };
  switch (layout) {
    case "mindmap": {
      if (cur.parentId === null) {
        if (dir !== "left" && dir !== "right") return null;
        return pickChild(positions, cur, (c) => c.side === dir, "y");
      }
      if (cur.side !== "left" && cur.side !== "right") return null;
      if (dir === cur.side) return pickChild(positions, cur, () => true, "y");
      if (dir === (cur.side === "right" ? "left" : "right")) return toParent;
      return null;
    }
    case "logic-right":
    case "tree":
      return horizontal("right");
    case "logic-left":
      return horizontal("left");
    case "org":
    case "flow":
      if (dir === "down") return pickChild(positions, cur, () => true, "x");
      if (dir === "up") return toParent;
      return null;
    case "timeline":
      if (cur.parentId === null && dir === "right")
        return pickChild(positions, cur, () => true, "x");
      return null;
    default:
      return null;
  }
}

export function neighbor(
  doc: MapDoc,
  layout: LayoutKind,
  id: string,
  dir: Dir,
  positions: Map<string, PlacedTopic>,
): string | null {
  void doc;
  const cur = positions.get(id);
  if (!cur) return null;
  const rel = relationalNeighbor(layout, cur, dir, positions);
  if (rel) return rel;
  const c = centre(cur);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const p of positions.values()) {
    if (p.id === id) continue;
    const pc = centre(p);
    const dx = pc.x - c.x;
    const dy = pc.y - c.y;
    const primary =
      dir === "right" ? dx : dir === "left" ? -dx : dir === "down" ? dy : -dy;
    if (primary <= 1) continue;
    const cross =
      dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + cross * 2;
    if (score < bestScore) {
      bestScore = score;
      best = p.id;
    }
  }
  return best;
}

export function createHistory(doc: MapDoc): MapHistory {
  return { past: [], present: doc, future: [] };
}

export function pushHistory(h: MapHistory, doc: MapDoc): MapHistory {
  if (doc === h.present) return h;
  return {
    past: [...h.past, h.present].slice(-HISTORY_LIMIT),
    present: doc,
    future: [],
  };
}

export function undo(h: MapHistory): MapHistory {
  const prev = h.past[h.past.length - 1];
  if (!prev) return h;
  return {
    past: h.past.slice(0, -1),
    present: prev,
    future: [h.present, ...h.future],
  };
}

export function redo(h: MapHistory): MapHistory {
  const next = h.future[0];
  if (!next) return h;
  return {
    past: [...h.past, h.present],
    present: next,
    future: h.future.slice(1),
  };
}
