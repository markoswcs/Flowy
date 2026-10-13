"use client";

import {
  ArrowUpRight,
  Circle,
  Diamond,
  Minus,
  Shapes,
  Square,
} from "lucide-react";
import {
  CaptureUpdateAction,
  Excalidraw,
  MainMenu,
  restoreLibraryItems,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  LibraryItems,
  UIAppState,
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
    ...(typeof state.penMode === "boolean" ? { penMode: state.penMode } : {}),
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

const MOBILE_SHAPE_OPTIONS = [
  { type: "rectangle", label: "Retângulo", icon: Square },
  { type: "diamond", label: "Losango", icon: Diamond },
  { type: "ellipse", label: "Círculo", icon: Circle },
  { type: "arrow", label: "Seta", icon: ArrowUpRight },
  { type: "line", label: "Linha", icon: Minus },
] as const;

function MobileShapePicker({
  isMobile,
  appState,
  apiRef,
}: {
  isMobile: boolean;
  appState: UIAppState;
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!isMobile) return null;

  return (
    <div ref={rootRef} className="flowy-mobile-shape-picker">
      <button
        type="button"
        className="flowy-mobile-shape-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="flowy-mobile-shape-menu"
        onClick={() => setOpen((current) => !current)}
      >
        <Shapes className="size-4" aria-hidden="true" />
        <span>Formas</span>
      </button>
      {open ? (
        <div
          id="flowy-mobile-shape-menu"
          className="flowy-mobile-shape-menu"
          role="menu"
          aria-label="Formas do fluxograma"
        >
          {MOBILE_SHAPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = appState.activeTool.type === option.type;
            return (
              <button
                key={option.type}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`flowy-mobile-shape-option${
                  selected ? " is-selected" : ""
                }`}
                onClick={() => {
                  apiRef.current?.setActiveTool({ type: option.type });
                  setOpen(false);
                }}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ExcalidrawCanvas({
  scene,
  onChange,
  onSave,
  name,
  userId,
  remoteScene,
  onLiveChange,
  penOnly,
}: {
  scene: ExcalidrawScene | null;
  onChange: (scene: ExcalidrawScene) => void;
  onSave: () => void;
  name: string;
  userId: string;
  remoteScene: ExcalidrawScene | null;
  onLiveChange: (scene: ExcalidrawScene) => void;
  penOnly: boolean;
}) {
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onLiveChangeRef = useRef(onLiveChange);
  const isReady = useRef(false);
  const isApplyingRemoteScene = useRef(false);
  const excalidrawApi = useRef<ExcalidrawImperativeAPI | null>(null);
  const librarySaveTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
      appState: {
        ...normalizedScene.appState,
        theme: canvasTheme,
        penMode: penOnly,
        penDetected: true,
      },
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
          penMode: penOnly,
          penDetected: true,
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
  }, [apiReady, canvasTheme, penOnly, remoteScene]);

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

  useEffect(() => {
    if (!apiReady || !excalidrawApi.current) return;
    isApplyingRemoteScene.current = true;
    try {
      excalidrawApi.current.updateScene({
        appState: { penMode: penOnly, penDetected: true },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    } catch {
      isApplyingRemoteScene.current = false;
      return;
    }
    window.requestAnimationFrame(() => {
      isApplyingRemoteScene.current = false;
    });
  }, [apiReady, penOnly]);

  useEffect(() => {
    if (!apiReady || !excalidrawApi.current) return;

    const refreshEditorGeometry = () => {
      excalidrawApi.current?.refresh();
    };
    const transitionRoot = containerRef.current?.closest(
      ".app-page-transition",
    );
    const firstFrame = window.requestAnimationFrame(refreshEditorGeometry);
    const secondFrame = window.requestAnimationFrame(() => {
      refreshEditorGeometry();
    });
    const settleTimer = window.setTimeout(refreshEditorGeometry, 700);
    const viewport = window.visualViewport;

    transitionRoot?.addEventListener("animationend", refreshEditorGeometry);
    window.addEventListener("resize", refreshEditorGeometry);
    viewport?.addEventListener("resize", refreshEditorGeometry);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      transitionRoot?.removeEventListener(
        "animationend",
        refreshEditorGeometry,
      );
      window.removeEventListener("resize", refreshEditorGeometry);
      viewport?.removeEventListener("resize", refreshEditorGeometry);
    };
  }, [apiReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const blockNonPenPointer = (event: PointerEvent) => {
      if (!penOnly || event.pointerType === "pen") return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("canvas.excalidraw__canvas")) return;

      event.preventDefault();
      event.stopPropagation();
    };

    container.addEventListener("pointerdown", blockNonPenPointer, true);
    return () =>
      container.removeEventListener("pointerdown", blockNonPenPointer, true);
  }, [penOnly]);

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

  const renderTopRightUI = useCallback(
    (isMobile: boolean, appState: UIAppState) => (
      <MobileShapePicker
        isMobile={isMobile}
        appState={appState}
        apiRef={excalidrawApi}
      />
    ),
    [],
  );

  return (
    <div
      ref={containerRef}
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
        renderTopRightUI={renderTopRightUI}
        onLibraryChange={handleLibraryChange}
        onChange={handleChange}
      >
        {mainMenu}
      </Excalidraw>
    </div>
  );
}
