"use client";

import { Check, Link2, StickyNote } from "lucide-react";
import { memo, useMemo, type CSSProperties } from "react";

import type { PlacedTopic, Topic } from "@/features/mindmap/types";
import type { TopicAppearance } from "@/features/mindmap/components/appearance";
import { isSafeUrl } from "@/features/mindmap/components/constants";
import {
  fontString,
  type TopicBox,
} from "@/features/mindmap/components/measure";
import { cn } from "@/lib/utils";

export interface TopicNodeHandlers {
  toggleCollapse: (id: string) => void;
  toggleDone: (id: string) => void;
  openNote: (id: string) => void;
}

interface TopicNodeProps {
  topic: Topic;
  placed: PlacedTopic;
  box: TopicBox;
  look: TopicAppearance;
  selected: boolean;
  dropping: boolean;
  hidden: boolean;
  handlers: TopicNodeHandlers;
}

const PRIORITY_COLORS = ["", "#DC2626", "#EA580C", "#2563EB"] as const;

function countDescendants(topic: Topic): number {
  return topic.children.reduce(
    (total, child) => total + 1 + countDescendants(child),
    0,
  );
}

function shapeClass(shape: TopicAppearance["shape"]): string {
  switch (shape) {
    case "rect":
      return "rounded-[2px]";
    case "pill":
      return "rounded-full";
    case "ellipse":
      return "rounded-[50%]";
    case "underline":
    case "none":
      return "rounded-none border-0";
    default:
      return "rounded-[10px]";
  }
}

function ShapeBackground({
  look,
  width,
  height,
}: {
  look: TopicAppearance;
  width: number;
  height: number;
}) {
  if (look.shape === "diamond") {
    return (
      <svg
        className="absolute inset-0 overflow-visible"
        width={width}
        height={height}
        aria-hidden="true"
      >
        <polygon
          points={`${width / 2},1 ${width - 1},${height / 2} ${width / 2},${height - 1} 1,${height / 2}`}
          fill={look.fill}
          stroke={look.border === "transparent" ? look.fill : look.border}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  const underline = look.shape === "underline";
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0",
        shapeClass(look.shape),
        !underline && "border",
      )}
      style={{
        backgroundColor: look.fill,
        // Longhand only: mixing borderColor with borderBottom breaks rerenders.
        borderColor: underline ? "transparent" : look.border,
        borderBottomColor: look.border,
        borderBottomWidth: underline ? 2.5 : undefined,
        borderBottomStyle: underline ? "solid" : undefined,
        boxShadow:
          look.fill === "transparent"
            ? undefined
            : "0 1px 2px rgb(0 0 0 / 0.12)",
      }}
    />
  );
}

function collapsePosition(side: PlacedTopic["side"]): string {
  switch (side) {
    case "left":
      return "left-0 top-1/2 -translate-x-[calc(100%+4px)] -translate-y-1/2";
    case "down":
      return "bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%+4px)]";
    case "up":
      return "top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+4px)]";
    default:
      return "right-0 top-1/2 translate-x-[calc(100%+4px)] -translate-y-1/2";
  }
}

function CollapseToggle({
  topic,
  placed,
  visible,
  onToggle,
}: {
  topic: Topic;
  placed: PlacedTopic;
  visible: boolean;
  onToggle: () => void;
}) {
  const count = useMemo(() => countDescendants(topic), [topic]);
  const collapsed = Boolean(topic.collapsed);
  return (
    <button
      type="button"
      data-topic-control=""
      onClick={onToggle}
      aria-label={collapsed ? `Expandir ${count} tópicos` : "Recolher ramo"}
      aria-expanded={!collapsed}
      className={cn(
        "absolute z-10 grid h-5 min-w-5 place-items-center rounded-full border-2 bg-white px-1 text-[10px] font-bold leading-none text-gray-800 shadow-sm transition-opacity",
        "before:absolute before:-inset-3 before:content-['']",
        collapsePosition(placed.side),
        collapsed || visible
          ? "opacity-100"
          : "opacity-0 group-hover/topic:opacity-100 focus-visible:opacity-100",
      )}
      style={{ borderColor: placed.branchColor }}
    >
      {collapsed ? count : "−"}
    </button>
  );
}

function LeadingBadges({
  topic,
  look,
  onToggleDone,
}: {
  topic: Topic;
  look: TopicAppearance;
  onToggleDone: () => void;
}) {
  return (
    <>
      {topic.done !== undefined ? (
        <button
          type="button"
          data-topic-control=""
          role="checkbox"
          aria-checked={topic.done}
          aria-label={
            topic.done ? "Marcar como pendente" : "Marcar como concluída"
          }
          onClick={onToggleDone}
          className="relative grid size-[18px] shrink-0 place-items-center rounded-[5px] border-2 before:absolute before:-inset-3 before:content-['']"
          style={{
            borderColor: look.color,
            backgroundColor: topic.done ? look.color : "transparent",
            color: look.fill === "transparent" ? "#fff" : look.fill,
          }}
        >
          {topic.done ? <Check className="size-3" strokeWidth={3.5} /> : null}
        </button>
      ) : null}
      {topic.priority ? (
        <span
          className="grid size-[18px] shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: PRIORITY_COLORS[topic.priority] }}
          aria-label={`Prioridade ${topic.priority}`}
        >
          {topic.priority}
        </span>
      ) : null}
      {topic.icon ? (
        <span className="shrink-0 leading-none" aria-hidden="true">
          {topic.icon}
        </span>
      ) : null}
    </>
  );
}

function TrailingBadges({
  topic,
  onOpenNote,
}: {
  topic: Topic;
  onOpenNote: () => void;
}) {
  const safeLink = topic.link && isSafeUrl(topic.link) ? topic.link : null;
  return (
    <>
      {topic.note ? (
        <button
          type="button"
          data-topic-control=""
          onClick={onOpenNote}
          aria-label="Abrir nota do tópico"
          className="relative shrink-0 opacity-80 hover:opacity-100 before:absolute before:-inset-3 before:content-['']"
        >
          <StickyNote className="size-3.5" />
        </button>
      ) : null}
      {safeLink ? (
        <a
          href={safeLink}
          target="_blank"
          rel="noopener noreferrer"
          data-topic-control=""
          aria-label={`Abrir link ${safeLink}`}
          title={safeLink}
          className="relative shrink-0 opacity-80 hover:opacity-100 before:absolute before:-inset-3 before:content-['']"
        >
          <Link2 className="size-3.5" />
        </a>
      ) : null}
    </>
  );
}

function TopicNodeView({
  topic,
  placed,
  box,
  look,
  selected,
  dropping,
  hidden,
  handlers,
}: TopicNodeProps) {
  const style: CSSProperties = {
    transform: `translate(${placed.x}px, ${placed.y}px)`,
    width: placed.width,
    height: placed.height,
    color: look.color,
    font: fontString(box.metrics),
    lineHeight: `${box.metrics.lineHeight}px`,
    opacity: hidden ? 0.35 : 1,
  };
  const hasChildren = topic.children.length > 0;
  return (
    <div
      data-topic-id={topic.id}
      role="treeitem"
      aria-selected={selected}
      aria-label={topic.text || "Tópico vazio"}
      className="group/topic absolute left-0 top-0 select-none transition-[transform,opacity] duration-[250ms] ease-out motion-reduce:transition-none"
      style={style}
    >
      <ShapeBackground
        look={look}
        width={placed.width}
        height={placed.height}
      />
      {selected || dropping ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -inset-[5px] rounded-[14px] border-2",
            dropping
              ? "border-dashed border-primary bg-primary/10"
              : "border-primary",
          )}
        />
      ) : null}
      <div
        className="relative flex h-full items-center justify-center gap-1.5"
        style={{ padding: `0 ${box.metrics.padX}px` }}
      >
        <LeadingBadges
          topic={topic}
          look={look}
          onToggleDone={() => handlers.toggleDone(topic.id)}
        />
        <div
          className="shrink-0 whitespace-pre text-center"
          style={{ width: box.textWidth }}
        >
          {box.lines.map((line, index) => (
            <div
              key={index}
              className={cn(topic.done && "line-through opacity-70")}
            >
              {line || " "}
            </div>
          ))}
        </div>
        <TrailingBadges
          topic={topic}
          onOpenNote={() => handlers.openNote(topic.id)}
        />
      </div>
      {hasChildren && placed.depth > 0 ? (
        <CollapseToggle
          topic={topic}
          placed={placed}
          visible={selected}
          onToggle={() => handlers.toggleCollapse(topic.id)}
        />
      ) : null}
    </div>
  );
}

function samePlacement(a: PlacedTopic, b: PlacedTopic): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.side === b.side &&
    a.depth === b.depth &&
    a.branchColor === b.branchColor
  );
}

function sameLook(a: TopicAppearance, b: TopicAppearance): boolean {
  return (
    a.shape === b.shape &&
    a.fill === b.fill &&
    a.color === b.color &&
    a.border === b.border
  );
}

export const TopicNode = memo(TopicNodeView, (prev, next) => {
  return (
    prev.topic === next.topic &&
    prev.box === next.box &&
    prev.selected === next.selected &&
    prev.dropping === next.dropping &&
    prev.hidden === next.hidden &&
    prev.handlers === next.handlers &&
    samePlacement(prev.placed, next.placed) &&
    sameLook(prev.look, next.look)
  );
});
