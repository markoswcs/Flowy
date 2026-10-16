"use client";

import { memo } from "react";

import type {
  Connector,
  LayoutKind,
  LayoutResult,
  Relation,
} from "@/features/mindmap/types";
import { relationGeometry } from "@/features/mindmap/components/relation-geometry";

const PATH_TRANSITION = { transition: "d 250ms ease-out" } as const;

export const ConnectorPaths = memo(function ConnectorPaths({
  connectors,
}: {
  connectors: Connector[];
}) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
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

interface RelationLayerProps {
  relations: Relation[];
  layout: LayoutResult;
  layoutKind: LayoutKind;
  selectedId: string | null;
  color: string;
}

export const RelationPaths = memo(function RelationPaths({
  relations,
  layout,
  layoutKind,
  selectedId,
  color,
}: RelationLayerProps) {
  return (
    <g fill="none">
      <defs>
        <marker
          id="flowy-map-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={color} />
        </marker>
        <marker
          id="flowy-map-arrow-selected"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--primary))" />
        </marker>
      </defs>
      {relations.map((relation) => {
        const from = layout.topics.get(relation.from);
        const to = layout.topics.get(relation.to);
        if (!from || !to) return null;
        const geometry = relationGeometry(relation, from, to, layoutKind);
        const selected = relation.id === selectedId;
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
              stroke={selected ? "hsl(var(--primary))" : color}
              strokeWidth={selected ? 2.5 : 1.75}
              strokeDasharray={geometry.dashed ? "6 5" : undefined}
              markerEnd={`url(#${selected ? "flowy-map-arrow-selected" : "flowy-map-arrow"})`}
              pointerEvents="none"
            />
            {relation.label ? (
              <text
                x={geometry.labelX}
                y={geometry.labelY - 6}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={selected ? "hsl(var(--primary))" : color}
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
