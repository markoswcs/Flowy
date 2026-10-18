"use client";

import { Focus, Spline, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  createMap,
  findTopic,
  pathTo,
  replaceTopic,
} from "@/features/mindmap/model";
import { layoutMap } from "@/features/mindmap/layout";
import type { MapDoc, TemplateId } from "@/features/mindmap/types";
import {
  IMPORT_ACCEPT,
  importMapFile,
  topicsInOrder,
} from "@/features/mindmap/interop/formats";
import { ActionSheet } from "@/features/mindmap/components/action-sheet";
import { FormatPanel } from "@/features/mindmap/components/format-panel";
import { MapCanvas } from "@/features/mindmap/components/map-canvas";
import { measureTopicBox } from "@/features/mindmap/components/measure";
import { Minimap } from "@/features/mindmap/components/minimap";
import { NotePanel } from "@/features/mindmap/components/note-panel";
import { OutlinePanel } from "@/features/mindmap/components/outline-panel";
import { PresentationBar } from "@/features/mindmap/components/presentation-bar";
import {
  SearchBar,
  searchTopics,
} from "@/features/mindmap/components/search-bar";
import { ShortcutsDialog } from "@/features/mindmap/components/shortcuts-dialog";
import { TopicQuickBar } from "@/features/mindmap/components/topic-quick-bar";
import { SidePanel } from "@/features/mindmap/components/side-panel";
import { TemplatePicker } from "@/features/mindmap/components/template-picker";
import { FirstUseTip } from "@/features/mindmap/components/first-use-tip";
import {
  DesktopToolbar,
  MobileToolbar,
  ZoomControls,
} from "@/features/mindmap/components/toolbar";
import type { ToolId } from "@/features/mindmap/components/tools";
import { floatingTopicIds } from "@/features/mindmap/components/tree-ops";
import {
  useDarkCanvas,
  useIsDesktop,
} from "@/features/mindmap/components/use-environment";
import { useMapActions } from "@/features/mindmap/components/use-map-actions";
import { useMapShortcuts } from "@/features/mindmap/components/use-map-shortcuts";
import { useStableHandlers } from "@/features/mindmap/components/use-stable-handlers";
import { useViewportControls } from "@/features/mindmap/components/use-viewport-controls";
import { createViewportStore } from "@/features/mindmap/components/viewport-store";
import { toast } from "@/lib/toast";

const KEEP_FOCUS_TOOLS = new Set<ToolId>([
  "format",
  "note",
  "outline",
  "trash",
  "search",
  "shortcuts",
  "import",
  "export-png",
  "export-svg",
  "export-md",
  "copy-outline",
  "export-xmind",
  "export-mm",
  "export-opml",
  "export-json",
  "export-txt",
]);

const NO_MATCHES: ReadonlySet<string> = new Set();

export interface MapWorkspaceProps {
  doc: MapDoc;
  title: string;
  canUndo: boolean;
  canRedo: boolean;
  commit: (doc: MapDoc) => void;
  undo: () => void;
  redo: () => void;
  onTrash: () => void;
}

function useLayout(doc: MapDoc) {
  const floatingIds = useMemo(() => floatingTopicIds(doc), [doc]);
  const layout = useMemo(
    () =>
      layoutMap(doc, (topic, depth) =>
        measureTopicBox(
          topic,
          depth + (floatingIds.has(topic.id) ? 1 : 0),
          doc.layout,
        ),
      ),
    [doc, floatingIds],
  );
  return { layout, floatingIds };
}

/**
 * Focus mode (MindMeister "focus", XMind "drill down") edits one branch as if
 * it were the whole map; changes are merged back into the full document.
 */
function useFocus(doc: MapDoc, commit: (doc: MapDoc) => void) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusTopic = focusId ? findTopic(doc, focusId) : null;
  const viewDoc = useMemo<MapDoc>(() => {
    if (!focusTopic) return doc;
    const inside = new Set(
      topicsInOrder({ ...doc, root: focusTopic, floating: [] }).map(
        (t) => t.id,
      ),
    );
    return {
      ...doc,
      // A collapsed branch would show only its root; open it while focused.
      root: { ...focusTopic, collapsed: undefined },
      floating: [],
      relations: doc.relations.filter(
        (r) => inside.has(r.from) && inside.has(r.to),
      ),
    };
  }, [doc, focusTopic]);

  function commitView(next: MapDoc) {
    if (!focusTopic) return commit(next);
    const outside = doc.relations.filter((r) => !viewDoc.relations.includes(r));
    const merged: MapDoc = {
      ...replaceTopic(doc, focusTopic.id, next.root),
      layout: next.layout,
      theme: next.theme,
      branchStyle: next.branchStyle,
    };
    const alive = new Set(topicsInOrder(merged).map((t) => t.id));
    commit({
      ...merged,
      relations: [...outside, ...next.relations].filter(
        (r) => alive.has(r.from) && alive.has(r.to),
      ),
    });
  }

  const trail = focusTopic ? pathTo(doc, focusTopic.id) : [];
  return {
    focusId: focusTopic ? focusTopic.id : null,
    trail,
    viewDoc,
    commitView,
    setFocusId,
  };
}

export function MapWorkspace(props: MapWorkspaceProps) {
  const [store] = useState(createViewportStore);
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();
  const darkCanvas = useDarkCanvas();
  const focus = useFocus(props.doc, props.commit);
  const doc = focus.viewDoc;
  const commit = focus.commitView;
  const { layout, floatingIds } = useLayout(doc);
  const view = useViewportControls(store, viewportRef, layout);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [search, setSearch] = useState<{ query: string; index: number } | null>(
    null,
  );
  const [slide, setSlide] = useState<number | null>(null);

  const actions = useMapActions({
    ...props,
    doc,
    exportDoc: props.doc,
    commit,
    layout,
    view,
    viewportRef,
    darkCanvas,
    isDesktop,
  });
  const { ui } = actions;

  const matches = useMemo(
    () => (search ? searchTopics(doc, search.query) : []),
    [doc, search],
  );
  const matchSet = useMemo(
    () => (matches.length ? new Set(matches) : NO_MATCHES),
    [matches],
  );
  const slides = useMemo(
    () =>
      slide === null
        ? []
        : topicsInOrder(doc)
            .filter((t) => layout.topics.has(t.id))
            .map((t) => t.id),
    [doc, layout, slide],
  );

  function stepSearch(delta: 1 | -1) {
    if (!search || !matches.length) return;
    const current = Math.min(search.index, matches.length - 1);
    const index = (current + delta + matches.length) % matches.length;
    setSearch({ ...search, index });
    const id = matches[index];
    if (id) actions.goToTopic(id);
  }

  function showSlide(index: number) {
    const ids = topicsInOrder(doc)
      .filter((t) => layout.topics.has(t.id))
      .map((t) => t.id);
    const clamped = Math.max(0, Math.min(index, ids.length - 1));
    const id = ids[clamped];
    setSlide(clamped);
    if (!id) return;
    actions.select([id]);
    view.frame(id);
  }

  function startPresentation() {
    actions.closePanel();
    setSearch(null);
    setSheetOpen(false);
    showSlide(0);
    if (!document.fullscreenElement)
      document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  function stopPresentation() {
    setSlide(null);
    if (document.fullscreenElement)
      document.exitFullscreen?.().catch(() => undefined);
    view.fit();
  }

  function toggleFocus() {
    if (focus.focusId) {
      focus.setFocusId(null);
    } else {
      if (!actions.primary) return;
      focus.setFocusId(actions.primary);
      actions.select([actions.primary]);
    }
    view.fitSoon();
  }

  async function importFile(file: File) {
    try {
      const imported = await importMapFile(
        file.name,
        new Uint8Array(await file.arrayBuffer()),
      );
      focus.setFocusId(null);
      props.commit(imported);
      actions.clearSelection();
      view.fitSoon();
    } catch {
      toast.error(
        "Não foi possível importar esse arquivo. Use .xmind, .mind, .mm, .opml, .json, .md ou .txt.",
      );
    }
  }

  function runTool(id: ToolId) {
    setSheetOpen(false);
    if (id === "template") return setTemplateOpen(true);
    if (id === "search")
      return setSearch((current) => (current ? null : { query: "", index: 0 }));
    if (id === "shortcuts") return setShortcutsOpen(true);
    if (id === "import") return fileRef.current?.click();
    if (id === "present") return startPresentation();
    if (id === "focus") return toggleFocus();
    if (id === "fullscreen") {
      if (document.fullscreenElement)
        void document.exitFullscreen?.().catch(() => undefined);
      else
        void document.documentElement
          .requestFullscreen?.()
          .catch(() => undefined);
      return;
    }
    actions.runTool(id);
    // Keep keyboard shortcuts working after clicking a toolbar button.
    if (!KEEP_FOCUS_TOOLS.has(id))
      viewportRef.current?.focus({ preventScroll: true });
  }

  function applyTemplate(template: TemplateId) {
    focus.setFocusId(null);
    props.commit(createMap(props.doc.root.text || props.title, template));
    setTemplateOpen(false);
    actions.clearSelection();
    view.fitSoon();
  }

  const canvasHandlers = useStableHandlers(actions.canvas);
  const presenting = slide !== null;
  const shortcutsEnabled =
    !ui.editing &&
    !templateOpen &&
    !ui.actionSheet &&
    !presenting &&
    !shortcutsOpen;
  useMapShortcuts(viewportRef, shortcutsEnabled, {
    ...actions.shortcuts,
    escape: () => {
      if (search) return setSearch(null);
      if (focus.focusId && !actions.primary) return toggleFocus();
      actions.shortcuts.escape();
    },
    run: runTool,
  });

  const toolState = {
    canUndo: props.canUndo,
    canRedo: props.canRedo,
    hasTopic: Boolean(actions.primary),
    linking: Boolean(ui.linking),
    formatOpen: ui.panel === "format",
    outlineOpen: ui.panel === "outline",
    searchOpen: Boolean(search),
    focused: Boolean(focus.focusId),
    hasStyleClip: Boolean(actions.styleClip),
  };
  const toolbarProps = {
    state: toolState,
    layout: doc.layout,
    theme: doc.theme,
    onRun: runTool,
    onLayout: actions.setLayout,
    onTheme: actions.setTheme,
  };
  const noteTopic = ui.panel === "note" ? actions.primaryTopic : null;
  const slideId = presenting ? slides[slide] : undefined;
  const slideTopic = slideId ? findTopic(doc, slideId) : null;
  const topBanner = presenting ? null : ui.linking ? (
    <div className="flowy-glass absolute left-1/2 top-[4.25rem] z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-primary/40 py-1.5 pl-4 pr-1.5 text-xs font-medium md:top-[4.5rem]">
      <Spline className="size-4 flowy-ink" aria-hidden="true" />
      {ui.linking.from
        ? "Escolha o tópico de destino"
        : "Escolha o tópico de origem"}
      <button
        type="button"
        onClick={actions.cancelLinking}
        className="grid size-8 place-items-center rounded-full hover:bg-accent"
        aria-label="Cancelar ligação"
      >
        <X className="size-3.5" />
      </button>
    </div>
  ) : search ? (
    <SearchBar
      query={search.query}
      index={Math.min(search.index, Math.max(matches.length - 1, 0))}
      count={matches.length}
      onQuery={(query) => {
        setSearch({ query, index: 0 });
        // Typing only jumps to visible matches; Enter/arrows also expand
        // collapsed branches (one undo step each, like XMind).
        const first = searchTopics(doc, query).find((id) =>
          layout.topics.has(id),
        );
        if (first) actions.goToTopic(first);
      }}
      onStep={stepSearch}
      onClose={() => {
        setSearch(null);
        viewportRef.current?.focus({ preventScroll: true });
      }}
    />
  ) : ui.hint ? (
    <div
      role="status"
      className="flowy-glass pointer-events-none absolute left-1/2 top-[4.25rem] z-30 max-w-[calc(100%-2rem)] -translate-x-1/2 animate-in fade-in slide-in-from-top-2 rounded-full border px-4 py-2 text-center text-xs font-medium md:top-[4.5rem]"
    >
      {ui.hint}
    </div>
  ) : null;

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <MapCanvas
        doc={doc}
        layout={layout}
        floatingIds={floatingIds}
        store={store}
        viewportRef={viewportRef}
        selection={actions.selectionSet}
        selectedRelationId={actions.relation?.id ?? null}
        editing={ui.editing}
        darkCanvas={darkCanvas}
        linking={Boolean(ui.linking)}
        matches={matchSet}
        manySelected={actions.selectionSet.size > 30}
        handlers={canvasHandlers}
      />

      {!presenting &&
      !ui.editing &&
      !ui.linking &&
      !ui.actionSheet &&
      actions.selectionSet.size === 1 &&
      actions.primary &&
      layout.topics.get(actions.primary) ? (
        <TopicQuickBar
          key={actions.primary}
          placed={layout.topics.get(actions.primary)!}
          store={store}
          isRoot={actions.primary === doc.root.id}
          onRun={runTool}
        />
      ) : null}

      {presenting ? null : (
        <>
          <DesktopToolbar {...toolbarProps} />
          <ZoomControls store={store} onRun={runTool} />
          {isDesktop && !ui.panel ? (
            <Minimap layout={layout} store={store} viewportRef={viewportRef} />
          ) : null}
          <MobileToolbar
            {...toolbarProps}
            sheetOpen={sheetOpen}
            onToggleSheet={() => setSheetOpen((open) => !open)}
          />
        </>
      )}

      {focus.focusId && !presenting ? (
        <div className="flowy-glass absolute left-3 top-3 z-20 flex max-w-[calc(100%-8rem)] md:max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full border py-1 pl-3 pr-1 text-xs md:top-[7.75rem]">
          <Focus
            className="size-3.5 shrink-0 flowy-ink"
            aria-hidden="true"
          />
          <nav
            aria-label="Caminho do foco"
            className="flex min-w-0 items-center gap-1"
          >
            {focus.trail.map((topic, index) => (
              <span key={topic.id} className="flex min-w-0 items-center gap-1">
                {index ? (
                  <span className="text-muted-foreground">›</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    focus.setFocusId(index === 0 ? null : topic.id);
                    view.fitSoon();
                  }}
                  className="max-w-32 truncate rounded px-1 font-medium hover:bg-accent"
                >
                  {topic.text || "Tópico"}
                </button>
              </span>
            ))}
          </nav>
          <button
            type="button"
            onClick={toggleFocus}
            aria-label="Sair do foco"
            title="Sair do foco (Esc)"
            className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-accent"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {topBanner}

      {presenting ? null : <FirstUseTip />}

      {presenting ? null : noteTopic ? (
        <SidePanel
          desktop={isDesktop}
          label="Painel de nota"
          onClose={actions.closePanel}
        >
          <NotePanel
            key={noteTopic.id}
            topic={noteTopic}
            onSave={(note) => actions.saveNote(noteTopic.id, note)}
            onClose={actions.closePanel}
          />
        </SidePanel>
      ) : ui.panel === "outline" ? (
        <SidePanel
          desktop={isDesktop}
          label="Estrutura em tópicos"
          onClose={actions.closePanel}
        >
          <OutlinePanel
            doc={doc}
            selection={actions.selectionSet}
            onSelect={(id) => {
              actions.select([id]);
              view.reveal(id);
            }}
            onRename={actions.renameTopic}
            onToggle={actions.toggleTopic}
            onAddChild={actions.addChildTo}
            onClose={actions.closePanel}
          />
        </SidePanel>
      ) : ui.panel === "format" ? (
        <SidePanel
          desktop={isDesktop}
          label="Painel de formatação"
          onClose={actions.closePanel}
        >
          <FormatPanel
            doc={doc}
            topics={actions.selectedTopics}
            primaryDepth={actions.primaryDepth}
            relation={actions.relation}
            actions={actions.format}
            onClose={actions.closePanel}
          />
        </SidePanel>
      ) : null}

      {ui.actionSheet ? (
        <ActionSheet
          x={ui.actionSheet.x}
          y={ui.actionSheet.y}
          title={actions.primaryTopic?.text || "Tópico"}
          onRun={runTool}
          onClose={actions.closeActionSheet}
        />
      ) : null}

      {presenting ? (
        <PresentationBar
          index={slide}
          count={slides.length}
          title={slideTopic?.text || "Tópico"}
          onStep={(delta) => showSlide(slide + delta)}
          onExit={stopPresentation}
        />
      ) : null}

      {shortcutsOpen ? (
        <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />
      ) : null}

      {templateOpen ? (
        <TemplatePicker
          title="Novo a partir de modelo"
          replaceWarning
          onPick={applyTemplate}
          onClose={() => setTemplateOpen(false)}
        />
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void importFile(file);
        }}
      />
    </div>
  );
}
