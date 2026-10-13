"use client";

import {
  CaptureUpdateAction,
  Excalidraw,
  MainMenu,
  restoreLibraryItems,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function normalizeLibraryItems(value: unknown): LibraryItems {
  if (!Array.isArray(value)) return [];
  try {
    return restoreLibraryItems(
      value as Parameters<typeof restoreLibraryItems>[0],
      "unpublished",
    );
  } catch {
    return [];
  }
}

function persistableAppState(
  appState: ExcalidrawInitialDataState["appState"] | undefined,
) {
  if (!appState || typeof appState !== "object") return {};
  const state = appState as Record<string, unknown>;
  const zoom = state.zoom;
  const normalizedZoom =
    typeof zoom === "number" && Number.isFinite(zoom)
      ? { value: zoom }
      : zoom &&
          typeof zoom === "object" &&
          "value" in zoom &&
          typeof zoom.value === "number" &&
          Number.isFinite(zoom.value)
        ? { value: zoom.value }
        : undefined;
  return {
    ...(state.theme === "light" || state.theme === "dark"
      ? { theme: state.theme }
      : {}),
    ...(typeof state.viewBackgroundColor === "string"
      ? { viewBackgroundColor: state.viewBackgroundColor }
      : {}),
    ...(typeof state.scrollX === "number" && Number.isFinite(state.scrollX)
      ? { scrollX: state.scrollX }
      : {}),
    ...(typeof state.scrollY === "number" && Number.isFinite(state.scrollY)
      ? { scrollY: state.scrollY }
      : {}),
    ...(normalizedZoom ? { zoom: normalizedZoom } : {}),
  } as ExcalidrawInitialDataState["appState"];
}

function normalizeScene(scene: ExcalidrawScene | null | undefined) {
  return {
    elements: Array.isArray(scene?.elements)
      ? scene.elements.filter(Boolean)
      : [],
    appState: persistableAppState(scene?.appState),
    files: scene?.files ?? {},
  } satisfies ExcalidrawScene;
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
  const onSaveRef = useRef(onSave);
  const onLiveChangeRef = useRef(onLiveChange);
  const isReady = useRef(false);
  const isApplyingRemoteScene = useRef(false);
  const excalidrawApi = useRef<ExcalidrawImperativeAPI | null>(null);
  const librarySaveTimer = useRef<number | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const [canvasTheme, setCanvasTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("white")
      ? "light"
      : "dark",
  );
  const libraryKey = `flowy:excalidraw-library:${userId}`;
  const [initialLibrary] = useState<LibraryItems>(() => {
    if (typeof window === "undefined") return [];
    try {
      return normalizeLibraryItems(
        JSON.parse(localStorage.getItem(libraryKey) ?? "[]"),
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onLiveChangeRef.current = onLiveChange;
  }, [onLiveChange]);

  useEffect(
    () => () => {
      if (librarySaveTimer.current)
        window.clearTimeout(librarySaveTimer.current);
    },
    [],
  );

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        isReady.current = true;
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  const [initialData] = useState(() => {
    const normalizedScene = normalizeScene(scene);
    return {
      ...normalizedScene,
      appState: { ...normalizedScene.appState, theme: canvasTheme },
      libraryItems: initialLibrary,
    };
  });

  const mainMenu = useMemo(
    () => (
      <MainMenu>
        <MainMenu.Item onSelect={() => onSaveRef.current()}>
          Salvar no Flowy
        </MainMenu.Item>
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
    ),
    [],
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setCanvasTheme(
        document.documentElement.classList.contains("white") ? "light" : "dark",
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!apiReady) return;
    let cancelled = false;
    void getExcalidrawLibrary(createClient(), userId)
      .then((remoteLibrary) => {
        if (!cancelled && remoteLibrary && excalidrawApi.current) {
          excalidrawApi.current.updateLibrary({
            libraryItems: normalizeLibraryItems(remoteLibrary),
          });
        }
      })
      .catch(() => {
        // A biblioteca local continua disponível quando a conta está offline.
      });
    return () => {
      cancelled = true;
    };
  }, [apiReady, userId]);

  useEffect(() => {
    if (!remoteScene || !excalidrawApi.current || !apiReady) return;
    isApplyingRemoteScene.current = true;
    try {
      const normalizedScene = normalizeScene(remoteScene);
      excalidrawApi.current.updateScene({
        ...normalizedScene,
        appState: {
          ...normalizedScene.appState,
          theme: canvasTheme,
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      } as Parameters<ExcalidrawImperativeAPI["updateScene"]>[0]);
    } catch {
      isApplyingRemoteScene.current = false;
      return;
    }
    window.requestAnimationFrame(() => {
      isApplyingRemoteScene.current = false;
    });
  }, [apiReady, canvasTheme, remoteScene]);

  useEffect(() => {
    if (!apiReady || !excalidrawApi.current) return;
    isApplyingRemoteScene.current = true;
    try {
      excalidrawApi.current.updateScene({
        appState: { theme: canvasTheme },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    } catch {
      isApplyingRemoteScene.current = false;
      return;
    }
    window.requestAnimationFrame(() => {
      isApplyingRemoteScene.current = false;
    });
  }, [apiReady, canvasTheme]);

  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    excalidrawApi.current = api;
    setApiReady(true);
  }, []);

  const handleLibraryChange = useCallback(
    (libraryItems: LibraryItems) => {
      try {
        localStorage.setItem(libraryKey, JSON.stringify(libraryItems));
      } catch {
        // A biblioteca continua disponível na sessão atual se o armazenamento falhar.
      }
      if (librarySaveTimer.current) {
        window.clearTimeout(librarySaveTimer.current);
      }
      librarySaveTimer.current = window.setTimeout(() => {
        void saveExcalidrawLibrary(createClient(), userId, libraryItems).catch(
          () => {
            // A cópia local já foi atualizada; a conta será sincronizada depois.
          },
        );
      }, 700);
    },
    [libraryKey, userId],
  );

  const handleChange = useCallback(
    (
      elements: ExcalidrawInitialDataState["elements"],
      appState: ExcalidrawInitialDataState["appState"],
      files: ExcalidrawInitialDataState["files"],
    ) => {
      if (isApplyingRemoteScene.current) return;
      if (!isReady.current) return;
      const nextScene = {
        elements,
        appState: persistableAppState(appState),
        files,
      };
      onChangeRef.current(nextScene);
      onLiveChangeRef.current(nextScene);
    },
    [],
  );

  const uiOptions = useMemo(
    () => ({
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
    }),
    [],
  );

  return (
    <div
      className="flowy-excalidraw h-full min-h-0 overflow-visible bg-background sm:overflow-hidden"
      role="region"
      aria-label="Área de edição do fluxograma"
    >
      <Excalidraw
        initialData={initialData}
        excalidrawAPI={handleApiReady}
        langCode="pt-BR"
        name={name.trim() || "Fluxograma sem título"}
        UIOptions={uiOptions}
        onLibraryChange={handleLibraryChange}
        onChange={handleChange}
      >
        {mainMenu}
      </Excalidraw>
    </div>
  );
}
