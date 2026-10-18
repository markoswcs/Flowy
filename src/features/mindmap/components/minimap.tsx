"use client";

import { Map as MapIcon, X } from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type RefObject,
} from "react";

import type { LayoutResult } from "@/features/mindmap/types";
import type { ViewportStore } from "@/features/mindmap/components/viewport-store";

const WIDTH = 184;
const HEIGHT = 120;
const PAD = 40;

interface MinimapProps {
  layout: LayoutResult;
  store: ViewportStore;
  viewportRef: RefObject<HTMLDivElement | null>;
}

/** Overview of the whole map with the visible area; click or drag to move. */
export function Minimap({ layout, store, viewportRef }: MinimapProps) {
  const [open, setOpen] = useState(true);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = viewportRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [viewportRef]);
  const view = useSyncExternalStore(store.subscribeView, store.get, store.get);
  const b = layout.bounds;
  const worldW = b.width + PAD * 2;
  const worldH = b.height + PAD * 2;
  const scale = Math.min(WIDTH / worldW, HEIGHT / worldH);
  const offsetX = (WIDTH - worldW * scale) / 2 - (b.x - PAD) * scale;
  const offsetY = (HEIGHT - worldH * scale) / 2 - (b.y - PAD) * scale;

  const vw = size.width / view.k;
  const vh = size.height / view.k;
  const vx = -view.x / view.k;
  const vy = -view.y / view.k;

  function moveTo(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const mapX = (event.clientX - box.left - offsetX) / scale;
    const mapY = (event.clientY - box.top - offsetY) / scale;
    const current = store.get();
    store.set({
      x: size.width / 2 - mapX * current.k,
      y: size.height / 2 - mapY * current.k,
      k: current.k,
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Mostrar minimapa"
        title="Mostrar minimapa"
        className="flowy-glass absolute bottom-[4.5rem] right-4 z-20 hidden size-11 place-items-center rounded-2xl border text-muted-foreground hover:text-foreground md:grid"
      >
        <MapIcon className="size-[18px]" />
      </button>
    );
  }

  return (
    <div className="flowy-glass absolute bottom-[4.5rem] right-4 z-20 hidden overflow-hidden rounded-2xl border md:block">
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Ocultar minimapa"
        className="absolute right-1 top-1 z-10 grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-accent"
      >
        <X className="size-3" />
      </button>
      <svg
        width={WIDTH}
        height={HEIGHT}
        role="img"
        aria-label="Minimapa"
        className="block cursor-pointer touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          moveTo(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons) moveTo(event);
        }}
      >
        <g transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
          {Array.from(layout.topics.values(), (p) => (
            <rect
              key={p.id}
              x={p.x}
              y={p.y}
              width={p.width}
              height={p.height}
              rx={6}
              fill={p.branchColor}
              fillOpacity={p.depth === 0 ? 0.9 : 0.55}
            />
          ))}
          <rect
            x={vx}
            y={vy}
            width={vw}
            height={vh}
            fill="hsl(var(--primary) / 0.08)"
            stroke="hsl(var(--primary))"
            strokeWidth={2 / scale}
            rx={4 / scale}
          />
        </g>
      </svg>
    </div>
  );
}
