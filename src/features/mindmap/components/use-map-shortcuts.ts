"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

import type { ToolId } from "@/features/mindmap/components/tools";

export type Direction = "up" | "down" | "left" | "right";

export interface ShortcutActions {
  run: (id: ToolId) => void;
  addSibling: (before: boolean) => void;
  navigate: (dir: Direction) => void;
  reorder: (delta: -1 | 1) => void;
  toggleCollapse: () => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  startTyping: (text: string) => void;
  escape: () => void;
  copy: (event: ClipboardEvent, cut: boolean) => void;
  paste: (event: ClipboardEvent) => void;
}

const ARROWS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** Shortcuts only fire when focus is on the page body or inside the canvas. */
function isMapTarget(
  target: EventTarget | null,
  canvas: HTMLElement | null,
): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target === document.body) return true;
  if (!canvas?.contains(target)) return false;
  return !target.closest(
    "input, textarea, select, button, a, [contenteditable='true']",
  );
}

function handleModified(
  event: KeyboardEvent,
  actions: ShortcutActions,
): boolean {
  const key = event.key.toLowerCase();
  if (event.altKey && (key === "c" || key === "v"))
    actions.run(key === "c" ? "copy-style" : "paste-style");
  else if (event.shiftKey && key === "b") actions.run("boundary");
  else if (event.shiftKey && key === "o") actions.run("outline");
  else if (event.shiftKey && key === "f") actions.run("focus");
  else if (key === "f") actions.run("search");
  else if (key === "a") actions.run("select-all");
  else if (key === "i") actions.toggleItalic();
  else if (key === "/") actions.run("shortcuts");
  else if (key === "z") actions.run(event.shiftKey ? "redo" : "undo");
  else if (key === "y") actions.run("redo");
  else if (key === "d") actions.run("duplicate");
  else if (key === "b") actions.toggleBold();
  else if (event.key === "Enter") actions.run("parent");
  else return false;
  return true;
}

function handlePlain(event: KeyboardEvent, actions: ShortcutActions): boolean {
  const arrow = ARROWS[event.key];
  if (arrow && event.altKey && (arrow === "up" || arrow === "down"))
    actions.reorder(arrow === "up" ? -1 : 1);
  else if (arrow) actions.navigate(arrow);
  else if (event.key === "Tab")
    actions.run(event.shiftKey ? "parent" : "child");
  else if (event.key === "Enter") actions.addSibling(event.shiftKey);
  else if (event.key === "Delete" || event.key === "Backspace")
    actions.run("delete");
  else if (event.key === "F2") actions.run("edit");
  else if (event.key === "F5") actions.run("present");
  else if (event.key === "F1") actions.run("shortcuts");
  else if (event.key === " ") actions.toggleCollapse();
  else if (event.key === "Escape") actions.escape();
  else if (event.key.length === 1 && !event.altKey)
    actions.startTyping(event.key);
  else return false;
  return true;
}

export function useMapShortcuts(
  canvasRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  actions: ShortcutActions,
) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled || event.defaultPrevented || event.isComposing) return;
    if (!isMapTarget(event.target, canvasRef.current)) return;
    const modified = event.ctrlKey || event.metaKey;
    const handled = modified
      ? handleModified(event, actions)
      : handlePlain(event, actions);
    if (handled) event.preventDefault();
  });

  const onClipboard = useEffectEvent((event: ClipboardEvent) => {
    if (!enabled || !isMapTarget(event.target, canvasRef.current)) return;
    if (event.type === "paste") actions.paste(event);
    else actions.copy(event, event.type === "cut");
  });

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => onKeyDown(event);
    const clipboard = (event: ClipboardEvent) => onClipboard(event);
    window.addEventListener("keydown", keydown);
    document.addEventListener("copy", clipboard);
    document.addEventListener("cut", clipboard);
    document.addEventListener("paste", clipboard);
    return () => {
      window.removeEventListener("keydown", keydown);
      document.removeEventListener("copy", clipboard);
      document.removeEventListener("cut", clipboard);
      document.removeEventListener("paste", clipboard);
    };
  }, []);
}
