"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef } from "react";
import type { ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";

export interface ExcalidrawScene {
  elements: ExcalidrawInitialDataState["elements"];
  appState?: ExcalidrawInitialDataState["appState"];
  files?: ExcalidrawInitialDataState["files"];
}

export function ExcalidrawCanvas({
  scene,
  onChange,
}: {
  scene: ExcalidrawScene | null;
  onChange: (scene: ExcalidrawScene) => void;
}) {
  const onChangeRef = useRef(onChange);
  const isReady = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  return (
    <div className="flowy-excalidraw h-full min-h-0 overflow-hidden bg-[#12101d]">
      <Excalidraw
        theme="dark"
        initialData={scene ?? undefined}
        UIOptions={{ canvasActions: { saveToActiveFile: false } }}
        onChange={(elements, appState, files) => {
          if (!isReady.current) {
            isReady.current = true;
            return;
          }
          onChangeRef.current({ elements, appState, files });
        }}
      />
    </div>
  );
}
