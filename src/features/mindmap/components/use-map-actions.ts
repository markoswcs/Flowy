"use client";

import { useMemo, useRef, useState, type RefObject } from "react";

import { toMarkdown, fromOutline } from "@/features/mindmap/export";
import {
  addChild,
  addParent,
  addRelation,
  addSibling,
  createTopic,
  deleteRelation,
  deleteTopics,
  expandToLevel,
  findParent,
  findTopic,
  moveTopic,
  neighbor,
  reorder,
  revealTopic,
  setAllCollapsed,
  clearOffsets,
  setLayout,
  setTheme,
  toggleCollapse,
  updateRelation,
  updateTopic,
} from "@/features/mindmap/model";
import type {
  LayoutKind,
  LayoutResult,
  MapDoc,
  Relation,
  ThemeId,
  Topic,
  TopicStyle,
} from "@/features/mindmap/types";
import {
  FLOATING_TOPIC_TEXT,
  NEW_CHILD_TEXT,
  NEW_TOPIC_TEXT,
} from "@/features/mindmap/components/constants";
import type { DropTarget } from "@/features/mindmap/components/drop-target";
import {
  toFlowyJson,
  toFreeMind,
  toIndentedText,
  toOpml,
  toXmindFile,
} from "@/features/mindmap/interop/formats";
import type { MarqueeRect } from "@/features/mindmap/components/use-canvas-gestures";
import {
  buildMapSvg,
  downloadBlob,
  safeFilename,
  svgToPngBlob,
} from "@/features/mindmap/components/export-image";
import type {
  FormatActions,
  TopicPatch,
} from "@/features/mindmap/components/format-panel";
import type { CanvasHandlers } from "@/features/mindmap/components/map-canvas";
import type {
  EditExit,
  EditingState,
} from "@/features/mindmap/components/topic-editor";
import type { ToolId } from "@/features/mindmap/components/tools";
import {
  cloneWithNewIds,
  duplicateTopic,
  insertSubtrees,
  subtreeDoc,
} from "@/features/mindmap/components/tree-ops";
import { isDesktopViewport } from "@/features/mindmap/components/use-environment";
import type { Direction } from "@/features/mindmap/components/use-map-shortcuts";
import type { useViewportControls } from "@/features/mindmap/components/use-viewport-controls";

type Panel = "format" | "note" | "outline" | null;

interface UiState {
  editing: EditingState | null;
  linking: { from: string | null } | null;
  panel: Panel;
  actionSheet: { x: number; y: number } | null;
  hint: string | null;
}

interface ActionDeps {
  doc: MapDoc;
  /** Whole map (differs from `doc` in focus mode); used for file exports. */
  exportDoc: MapDoc;
  title: string;
  commit: (doc: MapDoc) => void;
  undo: () => void;
  redo: () => void;
  onTrash: () => void;
  layout: LayoutResult;
  view: ReturnType<typeof useViewportControls>;
  viewportRef: RefObject<HTMLDivElement | null>;
  darkCanvas: boolean;
  isDesktop: boolean;
}

interface Clip {
  text: string;
  topics: Topic[];
}

const HINT_MS = 2600;

function cleanStyle(style: TopicStyle): TopicStyle | undefined {
  const entries = Object.entries(style).filter(
    ([, value]) => value !== undefined && value !== false,
  );
  return entries.length
    ? (Object.fromEntries(entries) as TopicStyle)
    : undefined;
}

export function useMapActions(deps: ActionDeps) {
  const { doc, commit, layout, view, viewportRef } = deps;
  const [selection, setSelection] = useState<string[]>([]);
  const [relationId, setRelationId] = useState<string | null>(null);
  const [ui, setUi] = useState<UiState>(() => ({
    editing: null,
    linking: null,
    // Only start open when there is room beside the map; otherwise it hides it.
    panel: isDesktopViewport() && window.innerWidth >= 1280 ? "format" : null,
    actionSheet: null,
    hint: null,
  }));
  const hintTimer = useRef<number | null>(null);
  const clipboard = useRef<Clip | null>(null);
  const [styleClip, setStyleClip] = useState<TopicStyle | null>(null);

  const visibleSelection = useMemo(
    () => selection.filter((id) => layout.topics.has(id)),
    [selection, layout],
  );
  const selectionSet = useMemo(
    () => new Set(visibleSelection),
    [visibleSelection],
  );
  const primary = visibleSelection[visibleSelection.length - 1] ?? null;
  const primaryTopic = primary ? findTopic(doc, primary) : null;
  const selectedTopics = useMemo(
    () =>
      visibleSelection
        .map((id) => findTopic(doc, id))
        .filter((t): t is Topic => Boolean(t)),
    [doc, visibleSelection],
  );
  const relation: Relation | null =
    doc.relations.find((r) => r.id === relationId) ?? null;
  const primaryDepth = primary ? (layout.topics.get(primary)?.depth ?? 1) : 1;

  const patchUi = (patch: Partial<UiState>) =>
    setUi((current) => ({ ...current, ...patch }));

  function showHint(message: string) {
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    patchUi({ hint: message });
    hintTimer.current = window.setTimeout(
      () => patchUi({ hint: null }),
      HINT_MS,
    );
  }

  function focusCanvas() {
    viewportRef.current?.focus({ preventScroll: true });
  }

  function select(ids: string[]) {
    setSelection(ids);
    setRelationId(null);
  }

  function selectAndEdit(next: MapDoc, id: string, text: string) {
    commit(next);
    select([id]);
    patchUi({ editing: { id, initial: text, mode: "select" } });
    view.revealSoon(id);
  }

  function requireTopic(): string | null {
    if (!primary) showHint("Selecione um tópico primeiro.");
    return primary;
  }

  /** With nothing selected the new topic goes under the central one. */
  function addChildTopic(base = doc, parentId = primary ?? base.root.id) {
    const result = addChild(base, parentId, NEW_CHILD_TEXT);
    selectAndEdit(result.doc, result.id, NEW_CHILD_TEXT);
  }

  function addSiblingTopic(before: boolean) {
    const id = requireTopic();
    if (!id) return;
    const isRoot = id === doc.root.id;
    const text = isRoot ? NEW_CHILD_TEXT : NEW_TOPIC_TEXT;
    const result = addSibling(doc, id, text, before);
    selectAndEdit(result.doc, result.id, text);
  }

  function addParentTopic() {
    const id = requireTopic();
    if (!id) return;
    if (!findParent(doc, id))
      return showHint("Esse tópico não pode ganhar um pai.");
    const result = addParent(doc, id, NEW_TOPIC_TEXT);
    selectAndEdit(result.doc, result.id, NEW_TOPIC_TEXT);
  }

  function deleteSelection() {
    if (relation) {
      commit(deleteRelation(doc, relation.id));
      setRelationId(null);
      return;
    }
    const ids = visibleSelection.filter((id) => id !== doc.root.id);
    if (!ids.length)
      return showHint(
        primary
          ? "O tópico central não pode ser excluído."
          : "Selecione um tópico primeiro.",
      );
    const fallback = (primary && findParent(doc, primary)?.id) ?? doc.root.id;
    const next = deleteTopics(doc, ids);
    commit(next);
    select([findTopic(next, fallback) ? fallback : doc.root.id]);
  }

  function editTopic(id: string | null = primary) {
    if (!id) return requireTopic();
    const topic = findTopic(doc, id);
    if (!topic) return;
    select([id]);
    patchUi({
      editing: { id, initial: topic.text, mode: "select" },
      actionSheet: null,
    });
  }

  function commitEdit(id: string, text: string, exit: EditExit) {
    const topic = findTopic(doc, id);
    patchUi({ editing: null });
    const changed =
      topic && topic.text !== text ? updateTopic(doc, id, { text }) : doc;
    if (exit === "child") addChildTopic(changed, id);
    else commit(changed);
    focusCanvas();
  }

  function startLinking() {
    if (ui.linking) return patchUi({ linking: null });
    patchUi({ linking: { from: primary } });
  }

  function linkTo(id: string) {
    const from = ui.linking?.from;
    if (!from) {
      select([id]);
      return patchUi({ linking: { from: id } });
    }
    if (from === id) return;
    const result = addRelation(doc, from, id);
    commit(result.doc);
    patchUi({ linking: null });
    setSelection([]);
    setRelationId(result.id);
    showHint(
      deps.isDesktop
        ? "Ligação criada. Dê um nome no painel ao lado."
        : "Ligação criada. Use Mais › Formatar para nomeá-la.",
    );
  }

  function dropTopic(
    id: string,
    target: DropTarget | null,
    dx: number,
    dy: number,
  ) {
    if (target) {
      const index =
        target.kind === "child" ? Number.POSITIVE_INFINITY : target.index;
      // A manual nudge made sense only under the old parent.
      commit(
        updateTopic(moveTopic(doc, id, target.parentId, index), id, {
          offset: undefined,
        }),
      );
      return;
    }
    const floating = doc.floating.find((topic) => topic.id === id);
    if (!floating) {
      // Dropped on empty canvas: the topic (and its subtree) stays there.
      const topic = findTopic(doc, id);
      if (!topic || id === doc.root.id || (dx === 0 && dy === 0)) return;
      commit(
        updateTopic(doc, id, {
          offset: {
            x: Math.round((topic.offset?.x ?? 0) + dx),
            y: Math.round((topic.offset?.y ?? 0) + dy),
          },
        }),
      );
      return;
    }
    commit({
      ...doc,
      floating: doc.floating.map((topic) =>
        topic.id === id
          ? { ...topic, x: topic.x + dx, y: topic.y + dy }
          : topic,
      ),
    });
  }

  function createFloating(x: number, y: number) {
    const topic = createTopic(FLOATING_TOPIC_TEXT);
    const next = {
      ...doc,
      floating: [
        ...doc.floating,
        { ...topic, x: Math.round(x - 60), y: Math.round(y - 18) },
      ],
    };
    selectAndEdit(next, topic.id, FLOATING_TOPIC_TEXT);
  }

  function patchTopics(patch: TopicPatch) {
    commit(
      visibleSelection.reduce((next, id) => updateTopic(next, id, patch), doc),
    );
  }

  function patchStyle(patch: TopicStyle) {
    const next = visibleSelection.reduce((current, id) => {
      const topic = findTopic(current, id);
      return topic
        ? updateTopic(current, id, {
            style: cleanStyle({ ...topic.style, ...patch }),
          })
        : current;
    }, doc);
    commit(next);
  }

  function navigate(dir: Direction) {
    if (!primary) return select([doc.root.id]);
    const next = neighbor(doc, doc.layout, primary, dir, layout.topics);
    if (!next) return;
    select([next]);
    view.reveal(next);
  }

  function toggleTopic(id: string) {
    const topic = findTopic(doc, id);
    if (topic?.children.length) commit(toggleCollapse(doc, id));
  }

  function copySelection(event: ClipboardEvent, cut: boolean) {
    if (!selectedTopics.length || !event.clipboardData) return;
    const text = selectedTopics
      .map((topic) => toMarkdown(subtreeDoc(doc, topic)))
      .join("");
    event.clipboardData.setData("text/plain", text);
    event.preventDefault();
    clipboard.current = { text, topics: selectedTopics };
    if (cut) deleteSelection();
  }

  function paste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (!text.trim()) return;
    event.preventDefault();
    const clip = clipboard.current;
    const topics =
      clip && clip.text === text
        ? clip.topics.map(cloneWithNewIds)
        : fromOutline(text);
    if (!topics.length) return;
    const parentId = primary ?? doc.root.id;
    commit(insertSubtrees(doc, parentId, topics));
    select(topics.map((topic) => topic.id));
    view.revealSoon(topics[0]?.id ?? parentId);
  }

  async function exportAs(
    kind:
      "png" | "svg" | "md" | "copy" | "xmind" | "mm" | "opml" | "json" | "txt",
  ) {
    const name = safeFilename(deps.title);
    const text = (content: string, type: string, ext: string) =>
      downloadBlob(
        new Blob([content], { type: `${type};charset=utf-8` }),
        `${name}.${ext}`,
      );
    try {
      const full = deps.exportDoc;
      if (kind === "md") return text(toMarkdown(full), "text/markdown", "md");
      if (kind === "txt")
        return text(toIndentedText(full), "text/plain", "txt");
      if (kind === "mm") return text(toFreeMind(full), "application/xml", "mm");
      if (kind === "opml")
        return text(toOpml(full, deps.title), "text/x-opml", "opml");
      if (kind === "json")
        return text(toFlowyJson(full), "application/json", "flowy.json");
      if (kind === "xmind")
        return downloadBlob(
          new Blob([toXmindFile(full, deps.title) as BlobPart], {
            type: "application/vnd.xmind.workbook",
          }),
          `${name}.xmind`,
        );
      if (kind === "copy") {
        await navigator.clipboard.writeText(toMarkdown(full));
        return showHint("Tópicos copiados para a área de transferência.");
      }
      const { svg, width, height } = buildMapSvg(doc, layout, deps.darkCanvas);
      const blob =
        kind === "svg"
          ? new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
          : await svgToPngBlob(svg, width, height);
      downloadBlob(blob, `${name}.${kind}`);
    } catch {
      showHint("Não foi possível exportar o mapa.");
    }
  }

  function selectArea(rect: MarqueeRect, additive: boolean) {
    const hits = Array.from(layout.topics.values())
      .filter(
        (p) =>
          p.x < rect.x + rect.width &&
          p.x + p.width > rect.x &&
          p.y < rect.y + rect.height &&
          p.y + p.height > rect.y,
      )
      .map((p) => p.id);
    select(additive ? [...new Set([...selection, ...hits])] : hits);
    focusCanvas();
  }

  function toggleBoundary() {
    const ids = visibleSelection;
    if (!ids.length) return requireTopic();
    const add = ids.some((id) => !findTopic(doc, id)?.boundary);
    commit(
      ids.reduce(
        (next, id) => updateTopic(next, id, { boundary: add ? {} : undefined }),
        doc,
      ),
    );
  }

  function copyStyle() {
    if (!primaryTopic) return requireTopic();
    setStyleClip({ ...primaryTopic.style });
    showHint("Estilo copiado. Selecione tópicos e use Colar estilo.");
  }

  function pasteStyle() {
    if (!styleClip || !visibleSelection.length) return;
    const style = cleanStyle(styleClip);
    commit(
      visibleSelection.reduce(
        (next, id) => updateTopic(next, id, { style }),
        doc,
      ),
    );
  }

  /** Selects a topic, expanding collapsed ancestors and scrolling to it. */
  function goToTopic(id: string) {
    if (!layout.topics.has(id)) {
      commit(revealTopic(doc, id));
      setSelection([id]);
      setRelationId(null);
      view.revealSoon(id);
      return;
    }
    select([id]);
    view.reveal(id);
  }

  function runTool(id: ToolId) {
    patchUi({ actionSheet: null });
    switch (id) {
      case "undo":
        return deps.undo();
      case "redo":
        return deps.redo();
      case "child":
        return addChildTopic();
      case "sibling":
        return addSiblingTopic(false);
      case "parent":
        return addParentTopic();
      case "duplicate": {
        const result = primary ? duplicateTopic(doc, primary) : null;
        if (!result)
          return showHint("Selecione um tópico que não seja o central.");
        commit(result.doc);
        return select([result.id]);
      }
      case "delete":
        return deleteSelection();
      case "edit":
        return editTopic();
      case "format":
        return patchUi({ panel: ui.panel === "format" ? null : "format" });
      case "note":
        return requireTopic() ? patchUi({ panel: "note" }) : undefined;
      case "collapse-all":
        return commit(setAllCollapsed(doc, true));
      case "expand-all":
        return commit(setAllCollapsed(doc, false));
      case "auto-arrange":
        return commit(clearOffsets(doc));
      case "link":
        return startLinking();
      case "fit":
        return view.fit();
      case "center":
        return view.center(primary ?? doc.root.id);
      case "zoom-in":
        return view.zoomBy(1);
      case "zoom-out":
        return view.zoomBy(-1);
      case "export-png":
        return void exportAs("png");
      case "export-svg":
        return void exportAs("svg");
      case "export-md":
        return void exportAs("md");
      case "copy-outline":
        return void exportAs("copy");
      case "export-xmind":
        return void exportAs("xmind");
      case "export-mm":
        return void exportAs("mm");
      case "export-opml":
        return void exportAs("opml");
      case "export-json":
        return void exportAs("json");
      case "export-txt":
        return void exportAs("txt");
      case "expand-1":
        return commit(expandToLevel(doc, 1));
      case "expand-2":
        return commit(expandToLevel(doc, 2));
      case "expand-3":
        return commit(expandToLevel(doc, 3));
      case "outline":
        return patchUi({ panel: ui.panel === "outline" ? null : "outline" });
      case "boundary":
        return toggleBoundary();
      case "floating": {
        const point = view.centerPoint();
        return createFloating(point.x, point.y + 80);
      }
      case "select-all":
        return select(Array.from(layout.topics.keys()));
      case "copy-style":
        return copyStyle();
      case "paste-style":
        return pasteStyle();
      case "trash":
        return deps.onTrash();
      case "template":
      case "search":
      case "focus":
      case "present":
      case "fullscreen":
      case "shortcuts":
      case "import":
        return;
    }
  }

  const canvas: CanvasHandlers = {
    tapTopic(id, additive) {
      if (ui.linking) return linkTo(id);
      focusCanvas();
      if (!additive) return select([id]);
      select(
        selection.includes(id)
          ? selection.filter((item) => item !== id)
          : [...selection, id],
      );
    },
    tapBackground() {
      if (ui.linking) return;
      select([]);
    },
    tapRelation(id) {
      setSelection([]);
      setRelationId(id);
    },
    openActions(id, x, y) {
      select([id]);
      patchUi({ actionSheet: { x, y }, linking: null });
    },
    dropTopic,
    editTopic,
    editRelation(id) {
      setSelection([]);
      setRelationId(id);
      patchUi({ panel: "format" });
      window.requestAnimationFrame(() =>
        document.getElementById("map-relation-label")?.focus(),
      );
    },
    createFloating,
    commitEdit,
    cancelEdit() {
      patchUi({ editing: null });
      focusCanvas();
    },
    toggleCollapse: toggleTopic,
    toggleDone(id) {
      const topic = findTopic(doc, id);
      if (topic && topic.done !== undefined)
        commit(updateTopic(doc, id, { done: !topic.done }));
    },
    openNote(id) {
      select([id]);
      patchUi({ panel: "note" });
    },
    selectArea,
  };

  const format: FormatActions = {
    patchTopics,
    patchStyle,
    openNote: () => patchUi({ panel: "note" }),
    setLayout: (next: LayoutKind) => {
      commit(setLayout(doc, next));
      view.fitSoon();
    },
    setTheme: (next: ThemeId) => commit(setTheme(doc, next)),
    setBranchStyle: (next) => {
      const updated: MapDoc = { ...doc, branchStyle: next };
      if (next === "curve") delete updated.branchStyle;
      commit(updated);
    },
    updateRelation: (patch) =>
      relation && commit(updateRelation(doc, relation.id, patch)),
    deleteRelation: () => {
      if (!relation) return;
      commit(deleteRelation(doc, relation.id));
      setRelationId(null);
    },
  };

  return {
    ui,
    primary,
    primaryTopic,
    primaryDepth,
    selectedTopics,
    selectionSet,
    relation,
    canvas,
    format,
    runTool,
    setLayout: format.setLayout,
    setTheme: format.setTheme,
    styleClip,
    goToTopic,
    select,
    renameTopic: (id: string, text: string) =>
      commit(updateTopic(doc, id, { text })),
    /** Saves the row's text and adds a child in one undo step. */
    addChildTo: (id: string, text?: string) =>
      addChildTopic(
        text !== undefined && text !== findTopic(doc, id)?.text
          ? updateTopic(doc, id, { text })
          : doc,
        id,
      ),
    toggleTopic,
    clearSelection: () => select([]),
    cancelLinking: () => patchUi({ linking: null }),
    closePanel: () => {
      patchUi({ panel: null });
      focusCanvas();
    },
    closeActionSheet: () => patchUi({ actionSheet: null }),
    saveNote: (id: string, note: string | undefined) =>
      commit(updateTopic(doc, id, { note })),
    shortcuts: {
      addSibling: addSiblingTopic,
      navigate,
      reorder: (delta: -1 | 1) =>
        primary && commit(reorder(doc, primary, delta)),
      toggleCollapse: () => primary && toggleTopic(primary),
      toggleBold: () =>
        primaryTopic && patchStyle({ bold: !primaryTopic.style?.bold }),
      toggleItalic: () =>
        primaryTopic && patchStyle({ italic: !primaryTopic.style?.italic }),
      startTyping: (text: string) =>
        primary &&
        patchUi({ editing: { id: primary, initial: text, mode: "replace" } }),
      escape: () => {
        if (ui.linking) return patchUi({ linking: null });
        if (ui.panel && !deps.isDesktop) return patchUi({ panel: null });
        select([]);
      },
      copy: copySelection,
      paste,
    },
  };
}
