"use client";

import { useEffectEvent, useLayoutEffect, useRef, type RefObject } from "react";

import type { LayoutResult } from "@/features/mindmap/types";
import { clampZoom, ZOOM_STEP } from "@/features/mindmap/components/constants";
import {
  zoomAt,
  type ViewportStore,
} from "@/features/mindmap/components/viewport-store";

const FIT_PADDING = 56;
const REVEAL_MARGIN = 72;

/** Fit / centre / zoom / keep-in-view helpers bound to the canvas element. */
export function useViewportControls(
  store: ViewportStore,
  viewportRef: RefObject<HTMLDivElement | null>,
  layout: LayoutResult,
) {
  const pendingFit = useRef(true);
  const pendingReveal = useRef<string | null>(null);

  function size() {
    const rect = viewportRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }

  /** Returns false while the canvas has no size yet. */
  function fit(maxZoom = 1, minZoom = 0, b = layout.bounds): boolean {
    const { width, height } = size();
    if (!width || !height) return false;
    const k = clampZoom(
      Math.min(
        maxZoom,
        (width - FIT_PADDING * 2) / Math.max(b.width, 1),
        (height - FIT_PADDING * 2) / Math.max(b.height, 1),
      ),
    );
    // Text that small is unreadable: keep a zoom floor, still centred on the
    // whole map so the person can pan from there.
    if (k < minZoom) {
      const floor = clampZoom(minZoom);
      store.set({
        x: width / 2 - (b.x + b.width / 2) * floor,
        y: height / 2 - (b.y + b.height / 2) * floor,
        k: floor,
      });
      return true;
    }
    store.set({
      x: width / 2 - (b.x + b.width / 2) * k,
      y: height / 2 - (b.y + b.height / 2) * k,
      k,
    });
    return true;
  }

  function center(id: string) {
    const placed = layout.topics.get(id);
    if (!placed) return;
    const { width, height } = size();
    const { k } = store.get();
    store.set({
      x: width / 2 - (placed.x + placed.width / 2) * k,
      y: height / 2 - (placed.y + placed.height / 2) * k,
      k,
    });
  }

  function zoomBy(direction: 1 | -1) {
    const { width, height } = size();
    const { k } = store.get();
    zoomAt(
      store,
      direction > 0 ? k * ZOOM_STEP : k / ZOOM_STEP,
      width / 2,
      height / 2,
    );
  }

  function reveal(id: string) {
    const placed = layout.topics.get(id);
    if (!placed) return;
    const { width, height } = size();
    const view = store.get();
    const left = placed.x * view.k + view.x;
    const top = placed.y * view.k + view.y;
    const right = left + placed.width * view.k;
    const bottom = top + placed.height * view.k;
    let dx = 0;
    let dy = 0;
    if (left < REVEAL_MARGIN) dx = REVEAL_MARGIN - left;
    else if (right > width - REVEAL_MARGIN) dx = width - REVEAL_MARGIN - right;
    if (top < REVEAL_MARGIN) dy = REVEAL_MARGIN - top;
    else if (bottom > height - REVEAL_MARGIN)
      dy = height - REVEAL_MARGIN - bottom;
    if (dx || dy) store.set({ x: view.x + dx, y: view.y + dy, k: view.k });
  }

  const afterLayout = useEffectEvent(() => {
    const phone = size().width < 640;
    if (pendingFit.current && fit(1, phone ? 0.5 : 0))
      pendingFit.current = false;
    if (pendingReveal.current) {
      reveal(pendingReveal.current);
      pendingReveal.current = null;
    }
  });

  useLayoutEffect(() => {
    afterLayout();
  }, [layout]);

  /** Frames a topic and its visible children (presentation steps). */
  function frame(id: string) {
    const placed = layout.topics.get(id);
    if (!placed) return;
    let minX = placed.x;
    let minY = placed.y;
    let maxX = placed.x + placed.width;
    let maxY = placed.y + placed.height;
    for (const p of layout.topics.values()) {
      if (p.parentId !== id) continue;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + p.width);
      maxY = Math.max(maxY, p.y + p.height);
    }
    fit(1.6, 0, { x: minX, y: minY, width: maxX - minX, height: maxY - minY });
  }

  /** Map coordinates of the middle of the canvas. */
  function centerPoint() {
    const { width, height } = size();
    const view = store.get();
    return {
      x: (width / 2 - view.x) / view.k,
      y: (height / 2 - view.y) / view.k,
    };
  }

  return {
    fit,
    frame,
    centerPoint,
    center,
    zoomBy,
    reveal,
    /** Fit once the next layout has been rendered (layout/template change). */
    fitSoon: () => {
      pendingFit.current = true;
    },
    /** Scroll a topic into view once the next layout has been rendered. */
    revealSoon: (id: string) => {
      pendingReveal.current = id;
    },
  };
}
