/**
 * Data model for the unified map editor (mind maps, logic charts, org charts,
 * trees, timelines and flowcharts), inspired by XMind and MindMeister.
 *
 * Stored as JSON in `notes.mindmap_data` (note kind "mindmap"). Older notes
 * hold Mind Elixir data (`{ nodeData: ... }`); `convert.ts` upgrades them.
 *
 * Module contract (all pure, no React, no DOM unless stated):
 *
 * model.ts
 *   createTopic(text?: string): Topic
 *   createMap(title: string, template?: TemplateId): MapDoc
 *   findTopic(doc, id): Topic | null
 *   findParent(doc, id): Topic | null          // null for root and floating
 *   pathTo(doc, id): Topic[]                    // root..topic
 *   flatten(doc): Topic[]                       // visible + collapsed, depth-first
 *   visibleTopics(doc): Topic[]                 // skips children of collapsed topics
 *   addChild(doc, parentId, text?): { doc, id }
 *   addSibling(doc, id, text?, before?): { doc, id }   // on root → addChild
 *   addParent(doc, id, text?): { doc, id }     // inserts a topic between id and its parent
 *   updateTopic(doc, id, patch: Partial<Omit<Topic,"id"|"children">>): MapDoc
 *   deleteTopics(doc, ids): MapDoc             // never deletes root; drops relations touching them
 *   moveTopic(doc, id, newParentId, index): MapDoc  // no-op if newParent is id or a descendant
 *   reorder(doc, id, delta: -1 | 1): MapDoc
 *   toggleCollapse(doc, id, collapsed?): MapDoc
 *   setAllCollapsed(doc, collapsed: boolean): MapDoc  // all non-root topics with children
 *   addRelation(doc, from, to, label?): { doc, id }
 *   updateRelation(doc, id, patch): MapDoc
 *   deleteRelation(doc, id): MapDoc
 *   setLayout(doc, layout): MapDoc
 *   setTheme(doc, theme): MapDoc
 *   neighbor(doc, layout, id, dir: "up"|"down"|"left"|"right", positions): string | null
 *       // keyboard navigation using laid-out positions
 *   createHistory(doc) / pushHistory / undo / redo   // capped at 100 entries
 *
 * layout.ts
 *   layoutMap(doc, measure: (topic, depth) => Size): LayoutResult
 *       Places every visible topic for doc.layout. Root centred at (0,0).
 *       Must handle very wide/deep trees without overlap.
 *
 * convert.ts
 *   parseMapData(raw: string | null, title: string): MapDoc
 *       Accepts v2 JSON, Mind Elixir JSON (nodeData/arrows/direction/style) or
 *       null/garbage (→ createMap(title)).
 *   serializeMap(doc): string
 *   TEMPLATES: { id: TemplateId; label: string; description: string; layout: LayoutKind }[]
 *
 * export.ts
 *   toPlainText(doc): string        // topics joined with " · " (search index)
 *   toMarkdown(doc): string         // nested bullet outline, notes as quotes
 *   fromOutline(text): Topic[]      // indented text / markdown bullets → topics (paste)
 */

export type LayoutKind =
  | "mindmap" // balanced both sides (XMind "Mind Map")
  | "logic-right" // XMind "Logic Chart" to the right
  | "logic-left"
  | "org" // org chart, top-down
  | "tree" // indented tree, top-left aligned (XMind "Tree Chart")
  | "timeline" // horizontal timeline, children of root along an axis
  | "flow"; // top-down flowchart; shapes + relations act as flow arrows

export type ThemeId = "flowy" | "classic" | "ocean" | "sunset" | "forest" | "mono";

export type TopicShape = "rounded" | "rect" | "pill" | "ellipse" | "diamond" | "underline" | "none";

export type TemplateId = "blank" | "brainstorm" | "project" | "meeting" | "study" | "swot" | "flowchart" | "org";

export interface TopicStyle {
  /** Hex background. Unset = theme colour for its depth/branch. */
  fill?: string;
  /** Hex text colour. */
  color?: string;
  shape?: TopicShape;
  bold?: boolean;
  /** Branch line colour for this topic and its descendants. */
  branch?: string;
}

export interface Topic {
  id: string;
  text: string;
  children: Topic[];
  collapsed?: boolean;
  style?: TopicStyle;
  /** A single emoji shown before the text (XMind "markers"). */
  icon?: string;
  /** 0 = none, 1..3 = priority badge. */
  priority?: 0 | 1 | 2 | 3;
  /** Task checkbox: undefined = no checkbox. */
  done?: boolean;
  /** Longer note shown in the side panel; a dot marks topics that have one. */
  note?: string;
  /** http(s) URL; opened in a new tab. */
  link?: string;
}

export interface Relation {
  id: string;
  from: string;
  to: string;
  label?: string;
  /** Flowcharts draw relations as straight arrows; maps as curves. */
  style?: "curve" | "straight" | "dashed";
}

export interface MapDoc {
  version: 2;
  layout: LayoutKind;
  theme: ThemeId;
  root: Topic;
  /** Free topics not attached to the root (XMind "floating topics"). */
  floating: Array<Topic & { x: number; y: number }>;
  relations: Relation[];
}

export interface Size {
  width: number;
  height: number;
}

export interface PlacedTopic {
  id: string;
  /** Top-left corner in map coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  /** Which side of the root a branch grows on (mind map / logic layouts). */
  side: "left" | "right" | "down" | "up";
  parentId: string | null;
  /** Colour of the branch this topic belongs to (from its first-level ancestor). */
  branchColor: string;
}

export interface Connector {
  from: string;
  to: string;
  /** SVG path data in map coordinates. */
  path: string;
  color: string;
  /** Thicker near the root, like XMind. */
  width: number;
}

export interface LayoutResult {
  topics: Map<string, PlacedTopic>;
  connectors: Connector[];
  bounds: { x: number; y: number; width: number; height: number };
}

export interface ThemeDef {
  id: ThemeId;
  label: string;
  /** Colours cycled across first-level branches. */
  branches: string[];
  root: { fill: string; color: string };
  /** Depth 1 topics are filled with the branch colour; deeper ones use this. */
  topic: { fill: string; color: string; border: string };
  /** Canvas background for light / dark app themes. */
  canvas: { light: string; dark: string };
}

export interface MapHistory {
  past: MapDoc[];
  present: MapDoc;
  future: MapDoc[];
}
