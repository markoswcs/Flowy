"use client";

import { Spline, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { createMap } from "@/features/mindmap/model";
import { layoutMap } from "@/features/mindmap/layout";
import type { MapDoc, TemplateId } from "@/features/mindmap/types";
import { ActionSheet } from "@/features/mindmap/components/action-sheet";
import { FormatPanel } from "@/features/mindmap/components/format-panel";
import { MapCanvas } from "@/features/mindmap/components/map-canvas";
import { measureTopicBox } from "@/features/mindmap/components/measure";
import { NotePanel } from "@/features/mindmap/components/note-panel";
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

const KEEP_FOCUS_TOOLS = new Set<ToolId>([
  "format",
  "note",
  "trash",
  "export-png",
  "export-svg",
  "export-md",
  "copy-outline",
]);

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

export function MapWorkspace(props: MapWorkspaceProps) {
  const { doc, commit } = props;
  const [store] = useState(createViewportStore);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const darkCanvas = useDarkCanvas();
  const { layout, floatingIds } = useLayout(doc);
  const view = useViewportControls(store, viewportRef, layout);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const actions = useMapActions({
    ...props,
    layout,
    view,
    viewportRef,
    darkCanvas,
    isDesktop,
  });
  const { ui } = actions;

  function runTool(id: ToolId) {
    setSheetOpen(false);
    if (id === "template") return setTemplateOpen(true);
    actions.runTool(id);
    // Keep keyboard shortcuts working after clicking a toolbar button.
    if (!KEEP_FOCUS_TOOLS.has(id))
      viewportRef.current?.focus({ preventScroll: true });
  }

  function applyTemplate(template: TemplateId) {
    commit(createMap(doc.root.text || props.title, template));
    setTemplateOpen(false);
    actions.clearSelection();
    view.fitSoon();
  }

  const canvasHandlers = useStableHandlers(actions.canvas);
  const shortcutsEnabled = !ui.editing && !templateOpen && !ui.actionSheet;
  useMapShortcuts(viewportRef, shortcutsEnabled, {
    ...actions.shortcuts,
    run: runTool,
  });

  const toolState = {
    canUndo: props.canUndo,
    canRedo: props.canRedo,
    hasTopic: Boolean(actions.primary),
    linking: Boolean(ui.linking),
    formatOpen: ui.panel === "format",
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
        handlers={canvasHandlers}
      />

      <DesktopToolbar {...toolbarProps} />
      <ZoomControls store={store} onRun={runTool} />
      <MobileToolbar
        {...toolbarProps}
        sheetOpen={sheetOpen}
        onToggleSheet={() => setSheetOpen((open) => !open)}
      />

      {ui.linking ? (
        <div className="flowy-glass absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-primary/40 py-1.5 pl-4 pr-1.5 text-xs font-medium md:top-[4.5rem]">
          <Spline className="size-4 text-primary" aria-hidden="true" />
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
      ) : null}

      {ui.hint && !ui.linking ? (
        <div
          role="status"
          className="flowy-glass pointer-events-none absolute left-1/2 top-3 z-30 max-w-[calc(100%-2rem)] -translate-x-1/2 animate-in fade-in slide-in-from-top-2 rounded-full border px-4 py-2 text-center text-xs font-medium md:top-[4.5rem]"
        >
          {ui.hint}
        </div>
      ) : null}

      <FirstUseTip />

      {noteTopic ? (
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

      {templateOpen ? (
        <TemplatePicker
          title="Novo a partir de modelo"
          replaceWarning
          onPick={applyTemplate}
          onClose={() => setTemplateOpen(false)}
        />
      ) : null}
    </div>
  );
}
