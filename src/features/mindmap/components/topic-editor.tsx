"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

import type { PlacedTopic } from "@/features/mindmap/types";
import {
  fontString,
  type TopicMetrics,
} from "@/features/mindmap/components/measure";

export interface EditingState {
  id: string;
  initial: string;
  /** Replace the whole text (start typing) or select it (F2, new topic). */
  mode: "select" | "replace";
}

export type EditExit = "stay" | "child" | "sibling";

interface TopicEditorProps {
  editing: EditingState;
  placed: PlacedTopic;
  metrics: TopicMetrics;
  onCommit: (id: string, text: string, exit: EditExit) => void;
  onCancel: () => void;
}

export function TopicEditor({
  editing,
  placed,
  metrics,
  onCommit,
  onCancel,
}: TopicEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.focus({ preventScroll: true });
    if (editing.mode === "select") field.select();
    else field.setSelectionRange(field.value.length, field.value.length);
  }, [editing]);

  function finish(exit: EditExit | "cancel") {
    if (finished.current) return;
    finished.current = true;
    if (exit === "cancel") onCancel();
    else onCommit(editing.id, ref.current?.value ?? editing.initial, exit);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      finish("cancel");
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      finish("stay");
    } else if (event.key === "Tab") {
      event.preventDefault();
      finish(event.shiftKey ? "stay" : "child");
    }
  }

  return (
    <textarea
      ref={ref}
      defaultValue={editing.initial}
      onKeyDown={onKeyDown}
      onBlur={() => finish("stay")}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label="Texto do tópico"
      rows={1}
      spellCheck
      className="absolute left-0 top-0 z-30 resize-none overflow-hidden rounded-[10px] border-2 border-primary bg-white text-center text-gray-900 shadow-xl outline-none [field-sizing:content]"
      style={{
        transform: `translate(${placed.x}px, ${placed.y}px)`,
        minWidth: placed.width,
        minHeight: placed.height,
        maxWidth: Math.max(placed.width, 420),
        font: fontString(metrics),
        lineHeight: `${metrics.lineHeight}px`,
        padding: `${metrics.padY}px ${metrics.padX}px`,
      }}
    />
  );
}
