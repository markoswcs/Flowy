import { clampZoom } from "@/features/mindmap/components/constants";

const GRID_SIZE = 28;

export interface Viewport {
  x: number;
  y: number;
  k: number;
}

/**
 * Pan/zoom lives outside React state: gestures write the transform straight
 * to the world element, so topics never re-render while panning. Only the
 * zoom label subscribes (via useSyncExternalStore).
 */
export interface ViewportStore {
  get(): Viewport;
  set(next: Viewport): void;
  attach(element: HTMLElement | null, background?: HTMLElement | null): void;
  subscribe(listener: () => void): () => void;
  getZoom(): number;
}

export function createViewportStore(): ViewportStore {
  let state: Viewport = { x: 0, y: 0, k: 1 };
  let element: HTMLElement | null = null;
  let background: HTMLElement | null = null;
  const listeners = new Set<() => void>();

  function apply() {
    if (element)
      element.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.k})`;
    if (background) {
      const size = GRID_SIZE * state.k;
      background.style.backgroundSize = `${size}px ${size}px`;
      background.style.backgroundPosition = `${state.x}px ${state.y}px`;
    }
  }

  return {
    get: () => state,
    getZoom: () => state.k,
    set(next) {
      const k = clampZoom(next.k);
      const zoomChanged = k !== state.k;
      state = { x: next.x, y: next.y, k };
      apply();
      if (zoomChanged) listeners.forEach((listener) => listener());
    },
    attach(next, nextBackground = null) {
      element = next;
      background = nextBackground;
      apply();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Zooms keeping the screen point (px, py) fixed. */
export function zoomAt(
  store: ViewportStore,
  k: number,
  px: number,
  py: number,
) {
  const view = store.get();
  const next = clampZoom(k);
  const mapX = (px - view.x) / view.k;
  const mapY = (py - view.y) / view.k;
  store.set({ x: px - mapX * next, y: py - mapY * next, k: next });
}
