"use client";

import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  LibraryItems,
} from "@excalidraw/excalidraw/types";

import {
  getExcalidrawLibrary,
  saveExcalidrawLibrary,
} from "@/services/excalidraw";
import { createClient } from "@/lib/supabase/client";

export interface ExcalidrawScene {
  elements: ExcalidrawInitialDataState["elements"];
  appState?: ExcalidrawInitialDataState["appState"];
  files?: ExcalidrawInitialDataState["files"];
}

export function ExcalidrawCanvas({
  scene,
  onChange,
  onSave,
  name,
  userId,
  remoteScene,
  onLiveChange,
}: {
  scene: ExcalidrawScene | null;
  onChange: (scene: ExcalidrawScene) => void;
  onSave: () => void;
  name: string;
  userId: string;
  remoteScene: ExcalidrawScene | null;
  onLiveChange: (scene: ExcalidrawScene) => void;
}) {
  const onChangeRef = useRef(onChange);
  const isReady = useRef(false);
  const isApplyingRemoteScene = useRef(false);
  const excalidrawApi = useRef<ExcalidrawImperativeAPI | null>(null);
  const librarySaveTimer = useRef<number | null>(null);
  const libraryKey = `flowy:excalidraw-library:${userId}`;
  const [initialLibrary] = useState<LibraryItems>(() => {
    try {
      const library = JSON.parse(localStorage.getItem(libraryKey) ?? "[]");
      return Array.isArray(library) ? library : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(
    () => () => {
      if (librarySaveTimer.current)
        window.clearTimeout(librarySaveTimer.current);
    },
    [],
  );

  const initialData = useCallback(async () => {
    let libraryItems = initialLibrary;
    try {
      const remoteLibrary = await getExcalidrawLibrary(createClient(), userId);
      if (remoteLibrary) libraryItems = remoteLibrary as LibraryItems;
    } catch {
      // O armazenamento local mantém a biblioteca disponível sem conexão.
    }
    return scene
      ? { ...scene, libraryItems }
      : { appState: { theme: "dark" as const }, libraryItems };
  }, [initialLibrary, scene, userId]);

  useEffect(() => {
    if (!remoteScene || !excalidrawApi.current) return;
    isApplyingRemoteScene.current = true;
    excalidrawApi.current.updateScene(
      remoteScene as Parameters<ExcalidrawImperativeAPI["updateScene"]>[0],
    );
    window.requestAnimationFrame(() => {
      isApplyingRemoteScene.current = false;
    });
  }, [remoteScene]);

  return (
    <div className="flowy-excalidraw h-full min-h-0 overflow-hidden bg-[#12101d]">
      <Excalidraw
        initialData={initialData}
        excalidrawAPI={(api) => {
          excalidrawApi.current = api;
        }}
        langCode="pt-BR"
        name={name.trim() || "Fluxograma sem título"}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: { saveFileToDisk: true },
            loadScene: true,
            saveAsImage: true,
            saveToActiveFile: false,
            toggleTheme: true,
          },
          tools: { image: true },
        }}
        onLibraryChange={(libraryItems) => {
          try {
            localStorage.setItem(libraryKey, JSON.stringify(libraryItems));
          } catch {
            // A biblioteca continua disponível na sessão atual se o armazenamento falhar.
          }
          if (librarySaveTimer.current) {
            window.clearTimeout(librarySaveTimer.current);
          }
          librarySaveTimer.current = window.setTimeout(() => {
            void saveExcalidrawLibrary(createClient(), userId, libraryItems);
          }, 700);
        }}
        onChange={(elements, appState, files) => {
          if (isApplyingRemoteScene.current) return;
          if (!isReady.current) {
            isReady.current = true;
            return;
          }
          onChangeRef.current({ elements, appState, files });
          onLiveChange({ elements, appState, files });
        }}
      >
        <MainMenu>
          <MainMenu.Item onSelect={onSave}>Salvar no Flowy</MainMenu.Item>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.SearchMenu />
          <MainMenu.DefaultItems.Help />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.Group title="Links do Excalidraw">
            <MainMenu.DefaultItems.Socials />
          </MainMenu.Group>
          <MainMenu.Separator />
          <MainMenu.DefaultItems.ToggleTheme />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
      </Excalidraw>
    </div>
  );
}
