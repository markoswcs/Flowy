"use client";

import { memo } from "react";

import type {
  Connector,
  LayoutKind,
  LayoutResult,
  Relation,
} from "@/features/mindmap/types";
import type { BoundaryRect } from "@/features/mindmap/components/boundaries";
import { relationGeometry } from "@/features/mindmap/components/relation-geometry";

const PATH_TRANSITION = { transition: "d 250ms ease-out" } as const;
const SELECTED = "hsl(var(--primary))";

/** Wobbly displacement that gives lines and shapes a hand-drawn look. */
export function SketchFilter() {
  return (
    <defs>
      <filter id="flowy-sketch" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.035"
          numOctaves="2"
          seed="7"
        />
        <feDisplacementMap in="SourceGraphic" scale="3.5" />
      </filter>
    </defs>
  );
}

export const ConnectorPaths = memo(function ConnectorPaths({
  connectors,
  sketch,
}: {
  connectors: Connector[];
  sketch: boolean;
}) {
  return (
    <g
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter={sketch ? "url(#flowy-sketch)" : undefined}
    >
      {connectors.map((connector) => (
        <path
          key={`${connector.from}-${connector.to}`}
          d={connector.path}
          stroke={connector.color}
          strokeWidth={connector.width}
          className="motion-reduce:[transition:none]"
          style={PATH_TRANSITION}
        />
      ))}
    </g>
  );
});

export const BoundaryShapes = memo(function BoundaryShapes({
  boundaries,
  sketch,
}: {
  boundaries: BoundaryRect[];
  sketch: boolean;
}) {
  return (
    <g filter={sketch ? "url(#flowy-sketch)" : undefined}>
      {boundaries.map((b) => (
        <g key={b.id}>
          <rect
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            rx={14}
            fill={b.color}
            fillOpacity={0.07}
            stroke={b.color}
            strokeWidth={1.5}
            strokeDasharray="7 5"
          />
          {b.label ? (
            <text
              x={b.x + 12}
              y={b.y + 15}
              fontSize={12}
              fontWeight={700}
              fill={b.color}
            >
              {b.label}
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
});

interface RelationLayerProps {
  relations: Relation[];
  layout: LayoutResult;
  layoutKind: LayoutKind;
  selectedId: string | null;
  color: string;
  sketch: boolean;
}

export function markerId(color: string): string {
  return `flowy-arrow-${color.replace(/[^a-z0-9]/gi, "")}`;
}

function ArrowMarker({ color }: { color: string }) {
  return (
    <marker
      id={markerId(color)}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="7"
      markerHeight="7"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" fill={color} />
    </marker>
  );
}

export const RelationPaths = memo(function RelationPaths({
  relations,
  layout,
  layoutKind,
  selectedId,
  color,
  sketch,
}: RelationLayerProps) {
  const colors = new Set([color, SELECTED]);
  relations.forEach((r) => r.color && colors.add(r.color));
  return (
    <g fill="none">
      <defs>
        {[...colors].map((c) => (
          <ArrowMarker key={c} color={c} />
        ))}
      </defs>
      {relations.map((relation) => {
        const from = layout.topics.get(relation.from);
        const to = layout.topics.get(relation.to);
        if (!from || !to) return null;
        const geometry = relationGeometry(relation, from, to, layoutKind);
        const selected = relation.id === selectedId;
        const stroke = selected ? SELECTED : (relation.color ?? color);
        const arrows = relation.arrows ?? "end";
        const marker = `url(#${markerId(stroke)})`;
        return (
          <g
            key={relation.id}
            data-relation-id={relation.id}
            className="cursor-pointer"
          >
            <path
              d={geometry.path}
              stroke="transparent"
              strokeWidth={16}
              pointerEvents="stroke"
            />
            <path
              d={geometry.path}
              stroke={stroke}
              strokeWidth={selected ? 2.5 : 1.75}
              strokeDasharray={geometry.dashed ? "6 5" : undefined}
              markerEnd={arrows === "none" ? undefined : marker}
              markerStart={arrows === "both" ? marker : undefined}
              filter={sketch ? "url(#flowy-sketch)" : undefined}
              pointerEvents="none"
            />
            {relation.label ? (
              <text
                x={geometry.labelX}
                y={geometry.labelY - 6}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={stroke}
                stroke="var(--map-canvas)"
                strokeWidth={4}
                paintOrder="stroke"
                pointerEvents="all"
              >
                {relation.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
});
