"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";

import { visibleTopics } from "@/features/mindmap/model";
import { THEMES } from "@/features/mindmap/themes";
import type {
  LayoutResult,
  MapDoc,
  PlacedTopic,
  Topic,
} from "@/features/mindmap/types";
import { topicAppearance } from "@/features/mindmap/components/appearance";
import { boundaryRects } from "@/features/mindmap/components/boundaries";
import {
  BoundaryShapes,
  ConnectorPaths,
  RelationPaths,
} from "@/features/mindmap/components/connector-layer";
import {
  findDropTarget,
  type DropTarget,
} from "@/features/mindmap/components/drop-target";
import { measureTopicBox } from "@/features/mindmap/components/measure";
import {
  TopicEditor,
  type EditExit,
  type EditingState,
} from "@/features/mindmap/components/topic-editor";
import {
  TopicNode,
  type TopicNodeHandlers,
} from "@/features/mindmap/components/topic-node";
import {
  useCanvasGestures,
  type MarqueeRect,
} from "@/features/mindmap/components/use-canvas-gestures";
import type { ViewportStore } from "@/features/mindmap/components/viewport-store";
import { cn } from "@/lib/utils";

export interface CanvasHandlers extends TopicNodeHandlers {
  tapTopic: (id: string, additive: boolean, touch: boolean) => void;
  tapBackground: () => void;
  tapRelation: (id: string) => void;
  openActions: (id: string, clientX: number, clientY: number) => void;
  dropTopic: (
    id: string,
    target: DropTarget | null,
    dx: number,
    dy: number,
  ) => void;
  editTopic: (id: string) => void;
  editRelation: (id: string) => void;
  createFloating: (x: number, y: number) => void;
  commitEdit: (id: string, text: string, exit: EditExit) => void;
  cancelEdit: () => void;
  selectArea: (rect: MarqueeRect, additive: boolean) => void;
}

interface MapCanvasProps {
  doc: MapDoc;
  layout: LayoutResult;
  floatingIds: ReadonlySet<string>;
  store: ViewportStore;
  viewportRef: RefObject<HTMLDivElement | null>;
  selection: ReadonlySet<string>;
  selectedRelationId: string | null;
  editing: EditingState | null;
  darkCanvas: boolean;
  linking: boolean;
  matches: ReadonlySet<string>;
  /** Large selections skip the animated glow to keep panning smooth. */
  manySelected: boolean;
  handlers: CanvasHandlers;
}

interface DragState {
  id: string;
  dx: number;
  dy: number;
  target: DropTarget | null;
}

function DropIndicator({
  target,
  layout,
}: {
  target: DropTarget;
  layout: LayoutResult;
}) {
  if (target.kind !== "sibling") return null;
  const ref = layout.topics.get(target.refId);
  if (!ref) return null;
  const horizontal = target.axis === "y";
  const offset = target.edge === "before" ? -7 : 4;
  const style = horizontal
    ? {
        left: ref.x,
        top: (target.edge === "before" ? ref.y : ref.y + ref.height) + offset,
        width: ref.width,
        height: 3,
      }
    : {
        left: (target.edge === "before" ? ref.x : ref.x + ref.width) + offset,
        top: ref.y,
        width: 3,
        height: ref.height,
      };
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]"
      style={style}
    />
  );
}

function useTopicIndex(doc: MapDoc) {
  return useMemo(() => {
    const index = new Map<string, Topic>();
    visibleTopics(doc).forEach((topic) => index.set(topic.id, topic));
    return index;
  }, [doc]);
}

export function MapCanvas(props: MapCanvasProps) {
  const {
    doc,
    layout,
    floatingIds,
    store,
    viewportRef,
    selection,
    editing,
    darkCanvas,
    handlers,
  } = props;
  const worldRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const boundaries = useMemo(() => boundaryRects(doc, layout), [doc, layout]);
  const topicIndex = useTopicIndex(doc);
  const theme = THEMES[doc.theme] ?? THEMES.flowy;
  const canvasColor = darkCanvas ? theme.canvas.dark : theme.canvas.light;

  useLayoutEffect(() => {
    store.attach(worldRef.current, gridRef.current);
    return () => store.attach(null, null);
  }, [store]);

  const gestures = useCanvasGestures(viewportRef, store, {
    onTopicTap: handlers.tapTopic,
    onBackgroundTap: handlers.tapBackground,
    onRelationTap: handlers.tapRelation,
    onTopicLongPress: handlers.openActions,
    canDrag: (id) => id !== doc.root.id,
    isSelected: (id) => selection.has(id),
    onDragMove: (id, x, y, dx, dy) =>
      setDrag({ id, dx, dy, target: findDropTarget(doc, layout, id, x, y) }),
    onDragEnd: (id, x, y, dx, dy) => {
      setDrag(null);
      if (Number.isNaN(x)) return;
      handlers.dropTopic(id, findDropTarget(doc, layout, id, x, y), dx, dy);
    },
    onMarquee: setMarquee,
    onMarqueeEnd: handlers.selectArea,
  });

  function onDoubleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, textarea, input")) return;
    const topicId =
      target.closest<HTMLElement>("[data-topic-id]")?.dataset.topicId;
    if (topicId) return handlers.editTopic(topicId);
    const relationId =
      target.closest<SVGElement>("[data-relation-id]")?.dataset.relationId;
    if (relationId) return handlers.editRelation(relationId);
    const point = gestures.toMap(gestures.local(event.clientX, event.clientY));
    handlers.createFloating(point.x, point.y);
  }

  function onContextMenu(event: MouseEvent<HTMLDivElement>) {
    const topicId = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-topic-id]",
    )?.dataset.topicId;
    if (!topicId) return;
    event.preventDefault();
    handlers.openActions(topicId, event.clientX, event.clientY);
  }

  const dropParent =
    drag?.target?.kind === "child" ? drag.target.parentId : null;
  const editingPlaced = editing ? layout.topics.get(editing.id) : undefined;
  const editingTopic = editing ? topicIndex.get(editing.id) : undefined;

  function renderTopic(placed: PlacedTopic, ghost = false) {
    const topic = topicIndex.get(placed.id);
    if (!topic) return null;
    const depth = placed.depth + (floatingIds.has(placed.id) ? 1 : 0);
    return (
      <TopicNode
        key={ghost ? `ghost-${placed.id}` : placed.id}
        topic={topic}
        placed={placed}
        box={measureTopicBox(topic, depth, doc.layout)}
        look={topicAppearance(
          topic,
          depth,
          placed.branchColor,
          theme,
          doc.layout,
          darkCanvas,
        )}
        selected={!ghost && selection.has(placed.id)}
        dropping={placed.id === dropParent}
        hidden={!ghost && drag?.id === placed.id}
        matched={!ghost && props.matches.has(placed.id)}
        handlers={handlers}
      />
    );
  }

  const dragPlaced = drag ? layout.topics.get(drag.id) : undefined;

  return (
    <div
      ref={viewportRef}
      role="tree"
      aria-label="Mapa"
      aria-multiselectable="true"
      data-many-selected={props.manySelected ? "" : undefined}
      tabIndex={-1}
      className={cn(
        "relative h-full w-full touch-none select-none overflow-hidden outline-none [-webkit-touch-callout:none]",
        props.linking
          ? "cursor-crosshair"
          : drag
            ? "cursor-grabbing"
            : "cursor-default",
      )}
      style={{
        backgroundColor: canvasColor,
        ["--map-canvas" as string]: canvasColor,
      }}
      onPointerDown={gestures.onPointerDown}
      onPointerMove={gestures.onPointerMove}
      onPointerUp={gestures.onPointerUp}
      onPointerCancel={gestures.onPointerCancel}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <div
        ref={gridRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, ${darkCanvas ? "rgb(255 255 255 / 0.07)" : "rgb(0 0 0 / 0.08)"} 1px, transparent 1.5px)`,
        }}
      />
      <div ref={worldRef} className="absolute left-0 top-0 origin-top-left">
        <svg
          className="pointer-events-none absolute left-0 top-0 overflow-visible"
          width={1}
          height={1}
          aria-hidden="true"
        >
          <BoundaryShapes boundaries={boundaries} />
          <ConnectorPaths connectors={layout.connectors} />
          <RelationPaths
            relations={doc.relations}
            layout={layout}
            layoutKind={doc.layout}
            selectedId={props.selectedRelationId}
            color={darkCanvas ? "#CBD5E1" : "#475569"}
          />
        </svg>
        {Array.from(layout.topics.values(), (placed) => renderTopic(placed))}
        {drag?.target ? (
          <DropIndicator target={drag.target} layout={layout} />
        ) : null}
        {drag && dragPlaced ? (
          <div
            className="pointer-events-none absolute left-0 top-0 z-20 opacity-90 drop-shadow-2xl"
            style={{ transform: `translate(${drag.dx}px, ${drag.dy}px)` }}
          >
            {renderTopic(dragPlaced, true)}
          </div>
        ) : null}
        {editing && editingPlaced && editingTopic ? (
          <TopicEditor
            key={`${editing.id}-${editing.mode}-${editing.initial}`}
            editing={editing}
            placed={editingPlaced}
            metrics={
              measureTopicBox(editingTopic, editingPlaced.depth, doc.layout)
                .metrics
            }
            onCommit={handlers.commitEdit}
            onCancel={handlers.cancelEdit}
          />
        ) : null}
      </div>
      {marquee ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-md border border-primary bg-primary/10"
          style={{
            left: marquee.x,
            top: marquee.y,
            width: marquee.width,
            height: marquee.height,
          }}
        />
      ) : null}
    </div>
  );
}
