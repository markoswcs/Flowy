"use client";

import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import {
  DRAG_THRESHOLD_MOUSE,
  DRAG_THRESHOLD_TOUCH,
  LONG_PRESS_MS,
} from "@/features/mindmap/components/constants";
import { useStableHandlers } from "@/features/mindmap/components/use-stable-handlers";
import {
  zoomAt,
  type Viewport,
  type ViewportStore,
} from "@/features/mindmap/components/viewport-store";

export interface GestureCallbacks {
  onTopicTap: (id: string, additive: boolean) => void;
  onBackgroundTap: () => void;
  onRelationTap: (id: string) => void;
  onTopicLongPress: (id: string, clientX: number, clientY: number) => void;
  /** Topics that can be dragged; others pan the canvas (the root). */
  canDrag: (id: string) => boolean;
  onDragMove: (
    id: string,
    mapX: number,
    mapY: number,
    dx: number,
    dy: number,
  ) => void;
  onDragEnd: (
    id: string,
    mapX: number,
    mapY: number,
    dx: number,
    dy: number,
  ) => void;
  /** Shift+drag on empty canvas: live rectangle in screen space (null = done). */
  onMarquee: (rect: MarqueeRect | null) => void;
  /** Final rectangle in map coordinates. */
  onMarqueeEnd: (rect: MarqueeRect, additive: boolean) => void;
}

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

type Gesture =
  | { type: "idle" }
  | { type: "pan"; last: Point; moved: boolean; relationId: string | null }
  | { type: "marquee"; start: Point; additive: boolean }
  | {
      type: "topic";
      id: string;
      start: Point;
      touch: boolean;
      additive: boolean;
      lifted: boolean;
      dragging: boolean;
    }
  | {
      type: "pinch";
      startDistance: number;
      startMid: Point;
      startView: Viewport;
    };

const CONTROL_SELECTOR =
  "button, a, input, textarea, select, [data-topic-control]";

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function rectOf(a: Point, b: Point): MarqueeRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function useCanvasGestures(
  viewportRef: RefObject<HTMLDivElement | null>,
  store: ViewportStore,
  callbacks: GestureCallbacks,
) {
  const cb = useStableHandlers(callbacks);
  const gesture = useRef<Gesture>({ type: "idle" });
  const pointers = useRef(new Map<number, Point>());
  const pressTimer = useRef<number | null>(null);

  function clearPressTimer() {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  function local(clientX: number, clientY: number): Point {
    const rect = viewportRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  }

  function toMap(point: Point): Point {
    const view = store.get();
    return { x: (point.x - view.x) / view.k, y: (point.y - view.y) / view.k };
  }

  function startPinch() {
    clearPressTimer();
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    gesture.current = {
      type: "pinch",
      startDistance: distance(a, b) || 1,
      startMid: midpoint(a, b),
      startView: store.get(),
    };
  }

  function movePinch() {
    const g = gesture.current;
    const [a, b] = [...pointers.current.values()];
    if (g.type !== "pinch" || !a || !b) return;
    const k = g.startView.k * (distance(a, b) / g.startDistance);
    const mid = midpoint(a, b);
    const anchorX = (g.startMid.x - g.startView.x) / g.startView.k;
    const anchorY = (g.startMid.y - g.startView.y) / g.startView.k;
    const clamped = Math.min(3, Math.max(0.25, k));
    store.set({
      x: mid.x - anchorX * clamped,
      y: mid.y - anchorY * clamped,
      k: clamped,
    });
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(CONTROL_SELECTOR) || event.button === 2) return;
    const point = local(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    } catch {
      // The pointer may already be gone; moves still reach the canvas.
    }
    if (pointers.current.size === 2) {
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;
    const topicId =
      target.closest<HTMLElement>("[data-topic-id]")?.dataset.topicId;
    if (!topicId && event.shiftKey && event.pointerType === "mouse") {
      gesture.current = {
        type: "marquee",
        start: point,
        additive: event.ctrlKey || event.metaKey,
      };
      return;
    }
    if (!topicId) {
      const relationId =
        target.closest<SVGElement>("[data-relation-id]")?.dataset.relationId ??
        null;
      gesture.current = { type: "pan", last: point, moved: false, relationId };
      return;
    }
    const touch = event.pointerType === "touch";
    gesture.current = {
      type: "topic",
      id: topicId,
      start: point,
      touch,
      additive: event.shiftKey || event.ctrlKey || event.metaKey,
      lifted: false,
      dragging: false,
    };
    if (touch) {
      pressTimer.current = window.setTimeout(() => {
        const g = gesture.current;
        if (g.type === "topic" && !g.dragging) {
          g.lifted = true;
          navigator.vibrate?.(12);
        }
      }, LONG_PRESS_MS);
    }
  }

  function moveTopic(g: Extract<Gesture, { type: "topic" }>, point: Point) {
    const threshold = g.touch ? DRAG_THRESHOLD_TOUCH : DRAG_THRESHOLD_MOUSE;
    if (!g.dragging && distance(point, g.start) < threshold) return;
    // Touch drags a topic straight away (like MindMeister); the root and
    // other fixed topics pan the canvas instead.
    if (!g.dragging && !cb.canDrag(g.id)) {
      clearPressTimer();
      gesture.current = {
        type: "pan",
        last: point,
        moved: true,
        relationId: null,
      };
      return;
    }
    g.dragging = true;
    const k = store.get().k;
    const map = toMap(point);
    cb.onDragMove(
      g.id,
      map.x,
      map.y,
      (point.x - g.start.x) / k,
      (point.y - g.start.y) / k,
    );
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = local(event.clientX, event.clientY);
    pointers.current.set(event.pointerId, point);
    const g = gesture.current;
    if (g.type === "pinch") movePinch();
    else if (g.type === "marquee") cb.onMarquee(rectOf(g.start, point));
    else if (g.type === "topic") moveTopic(g, point);
    else if (g.type === "pan") {
      const view = store.get();
      const dx = point.x - g.last.x;
      const dy = point.y - g.last.y;
      if (!g.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      g.moved = true;
      g.last = point;
      store.set({ x: view.x + dx, y: view.y + dy, k: view.k });
    }
  }

  function finishTopic(
    g: Extract<Gesture, { type: "topic" }>,
    point: Point,
    event: ReactPointerEvent,
  ) {
    if (g.dragging) {
      const k = store.get().k;
      const map = toMap(point);
      cb.onDragEnd(
        g.id,
        map.x,
        map.y,
        (point.x - g.start.x) / k,
        (point.y - g.start.y) / k,
      );
    } else if (g.lifted) {
      cb.onTopicLongPress(g.id, event.clientX, event.clientY);
    } else {
      cb.onTopicTap(g.id, g.additive);
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = local(event.clientX, event.clientY);
    pointers.current.delete(event.pointerId);
    clearPressTimer();
    const g = gesture.current;
    if (g.type === "pinch") {
      if (pointers.current.size === 0) gesture.current = { type: "idle" };
      return;
    }
    gesture.current = { type: "idle" };
    if (g.type === "marquee") {
      cb.onMarquee(null);
      const a = toMap(g.start);
      const b = toMap(point);
      if (distance(g.start, point) < 4) cb.onBackgroundTap();
      else cb.onMarqueeEnd(rectOf(a, b), g.additive);
    } else if (g.type === "topic") finishTopic(g, point, event);
    else if (g.type === "pan" && !g.moved) {
      if (g.relationId) cb.onRelationTap(g.relationId);
      else cb.onBackgroundTap();
    }
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    clearPressTimer();
    const g = gesture.current;
    if (g.type === "topic" && g.dragging) cb.onDragEnd(g.id, NaN, NaN, 0, 0);
    if (g.type === "marquee") cb.onMarquee(null);
    if (pointers.current.size === 0) gesture.current = { type: "idle" };
  }

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const target: HTMLElement = element;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      const unit = event.deltaMode === 1 ? 16 : 1;
      const view = store.get();
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp((-event.deltaY * unit) / 300);
        zoomAt(
          store,
          view.k * factor,
          event.clientX - rect.left,
          event.clientY - rect.top,
        );
        return;
      }
      const dx =
        (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * unit;
      const dy = (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * unit;
      store.set({ x: view.x - dx, y: view.y - dy, k: view.k });
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [viewportRef, store]);

  useEffect(() => {
    const timer = pressTimer;
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    toMap,
    local,
  };
}
