"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { serializeMap } from "@/features/mindmap/convert";
import { toPlainText } from "@/features/mindmap/export";
import {
  createHistory,
  pushHistory,
  redo,
  undo,
} from "@/features/mindmap/model";
import type { MapDoc, MapHistory } from "@/features/mindmap/types";
import { SAVE_DELAY } from "@/features/mindmap/components/constants";
import { useSaveNote } from "@/features/notes/use-notes";

export type SaveStatus = "saved" | "saving" | "offline" | "error";

export const UNTITLED_MAP = "Mapa sem título";

/** Map history plus debounced autosave of title + map to the note. */
export function useMapDocument(
  noteId: string,
  initialTitle: string,
  initialDoc: MapDoc,
) {
  const { mutateAsync: saveNote } = useSaveNote(noteId);
  const [history, setHistory] = useState<MapHistory>(() =>
    createHistory(initialDoc),
  );
  const [title, setTitleState] = useState(initialTitle);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const docRef = useRef(initialDoc);
  const titleRef = useRef(initialTitle);
  const timer = useRef<number | null>(null);

  const persist = useCallback(async () => {
    timer.current = null;
    const doc = docRef.current;
    setStatus("saving");
    try {
      await saveNote({
        title: titleRef.current.trim() || UNTITLED_MAP,
        mindmap_data: serializeMap(doc),
        plain_text: toPlainText(doc).slice(0, 20000),
      });
      setStatus("saved");
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
    }
  }, [saveNote]);

  const scheduleSave = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setStatus("saving");
    timer.current = window.setTimeout(() => void persist(), SAVE_DELAY);
  }, [persist]);

  useEffect(
    () => () => {
      if (timer.current === null) return;
      window.clearTimeout(timer.current);
      void persist();
    },
    [persist],
  );

  function commit(next: MapDoc) {
    if (next === docRef.current) return;
    docRef.current = next;
    setHistory((current) => pushHistory(current, next));
    scheduleSave();
  }

  function travel(step: (h: MapHistory) => MapHistory) {
    const next = step(history);
    if (next === history) return;
    docRef.current = next.present;
    setHistory(next);
    scheduleSave();
  }

  function setTitle(value: string) {
    titleRef.current = value;
    setTitleState(value);
    scheduleSave();
  }

  return {
    doc: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    commit,
    undo: () => travel(undo),
    redo: () => travel(redo),
    title,
    setTitle,
    status,
    saveNow: persist,
  };
}
