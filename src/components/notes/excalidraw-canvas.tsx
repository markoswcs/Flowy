"use client";

import {
  ChevronDown,
  ChevronUp,
  LayoutTemplate,
  PenTool,
  Save,
  Trash2,
} from "lucide-react";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
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

import { EXCALIDRAW_TEMPLATES } from "@/components/notes/excalidraw-templates";
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

const EXAMPLE_FLOWCHART_TRANSLATIONS: Record<string, string> = {
  Christmas: "Natal",
  "Get money": "Conseguir dinheiro",
  "Go shopping": "Ir às compras",
  "Let me think": "Deixe-me pensar",
  One: "Um",
  Two: "Dois",
  Three: "Três",
  Laptop: "Notebook",
  Car: "Carro",
};

function translateExampleFlowchartElements(
  elements: ExcalidrawInitialDataState["elements"],
) {
  return elements?.map((element) => {
    if (!element || element.type !== "text") return element;
    const translation = EXAMPLE_FLOWCHART_TRANSLATIONS[element.text.trim()];
    if (!translation) return element;

    return {
      ...element,
      text: element.text.replace(element.text.trim(), translation),
      originalText: element.originalText.replace(
        element.originalText.trim(),
        translation,
      ),
    };
  });
}

const PANEL_SHAPE_TOOLS = new Set([
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
]);
type PanelShapeTool = "rectangle" | "diamond" | "ellipse" | "arrow" | "line";

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
      ? translateExampleFlowchartElements(scene.elements.filter(Boolean))
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
  penOnly,
  onTogglePenOnly,
  onTrash,
}: {
  scene: ExcalidrawScene | null;
  onChange: (scene: ExcalidrawScene) => void;
  onSave: () => void;
  name: string;
  userId: string;
  remoteScene: ExcalidrawScene | null;
  onLiveChange: (scene: ExcalidrawScene) => void;
  penOnly: boolean;
  onTogglePenOnly: () => void;
  onTrash: () => void;
}) {
  const onChangeRef = useRef(onChange);
  const onTogglePenOnlyRef = useRef(onTogglePenOnly);
  const onTrashRef = useRef(onTrash);
  const onSaveRef = useRef(onSave);
  const onLiveChangeRef = useRef(onLiveChange);
  const isReady = useRef(false);
  const isApplyingRemoteScene = useRef(false);
  const excalidrawApi = useRef<ExcalidrawImperativeAPI | null>(null);
  // Places a template in an empty spot of the canvas and scrolls to it.
  const insertTemplate = useCallback(
    (skeleton: Parameters<typeof convertToExcalidrawElements>[0]) => {
      const api = excalidrawApi.current;
      if (!api || !skeleton) return;
      const existing = api.getSceneElements();
      let centerX: number;
      let centerY: number;
      if (existing.length > 0) {
        // Put the template to the right of what is already drawn, never on top of it.
        centerX = Math.max(...existing.map((el) => el.x + el.width)) + 200;
        centerY = Math.min(...existing.map((el) => el.y));
      } else {
        const { scrollX, scrollY, zoom, width, height } = api.getAppState();
        centerX = -scrollX + width / 2 / zoom.value - 400;
        centerY = -scrollY + height / 2 / zoom.value - 200;
      }
      const elements = convertToExcalidrawElements(
        skeleton.map((element) => ({
          ...element,
          x: (element.x ?? 0) + centerX,
          y: (element.y ?? 0) + centerY,
        })),
      );
      api.updateScene({
        elements: [...api.getSceneElements(), ...elements],
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      api.scrollToContent(elements, { fitToContent: true, animate: true });
    },
    [],
  );
  const librarySaveTimer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [apiReady, setApiReady] = useState(false);
  const [mobileToolsCollapsed, setMobileToolsCollapsed] = useState(false);
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

  useEffect(() => {
    onTogglePenOnlyRef.current = onTogglePenOnly;
    onTrashRef.current = onTrash;
  }, [onTogglePenOnly, onTrash]);

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
        <MainMenu.Item icon={<Save />} onSelect={() => onSaveRef.current()}>
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
        <MainMenu.Group title="Modelos prontos">
          {EXCALIDRAW_TEMPLATES.map((template) => (
            <MainMenu.Item
              key={template.id}
              icon={<LayoutTemplate />}
              onSelect={() => insertTemplate(template.build())}
            >
              {template.label}
            </MainMenu.Item>
          ))}
        </MainMenu.Group>
        {/* On phones the header has no room for these, so they live here. */}
        <MainMenu.Group title="Fluxograma" className="flowy-mobile-menu-group">
          <MainMenu.Item
            icon={<PenTool />}
            selected={penOnly}
            onSelect={() => onTogglePenOnlyRef.current()}
          >
            {penOnly ? "Desativar somente caneta" : "Somente caneta"}
          </MainMenu.Item>
          <MainMenu.Item
            className="flowy-menu-item-danger"
            icon={<Trash2 />}
            onSelect={() => onTrashRef.current()}
          >
            Mover para lixeira
          </MainMenu.Item>
        </MainMenu.Group>
      </MainMenu>
    ),
    [penOnly, insertTemplate],
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

  // On phones the shape tools are shown inside the "more tools" panel (see globals.css),
  // but they are not part of its DOM, so the panel closes on pointerdown before the
  // click reaches them. Pick the tool on pointerdown instead.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pickShapeFromPanel = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!container.querySelector(".App-toolbar__extra-tools-dropdown")) return;
      const input = target
        .closest(".App-toolbar--mobile .ToolIcon")
        ?.querySelector<HTMLInputElement>("input[data-testid^='toolbar-']");
      const type = input?.dataset.testid?.replace("toolbar-", "");
      if (!type || !PANEL_SHAPE_TOOLS.has(type)) return;

      excalidrawApi.current?.setActiveTool({
        type: type as PanelShapeTool,
      });
    };

    container.addEventListener("pointerdown", pickShapeFromPanel, true);
    return () =>
      container.removeEventListener("pointerdown", pickShapeFromPanel, true);
  }, []);

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
      ref={containerRef}
      className={`flowy-excalidraw relative h-full min-h-0 overflow-visible bg-background sm:overflow-hidden${
        mobileToolsCollapsed ? " flowy-mobile-tools-collapsed" : ""
      }`}
      role="region"
      aria-label="Área de edição do fluxograma"
    >
      <button
        type="button"
        className="flowy-mobile-tools-toggle"
        onClick={() => setMobileToolsCollapsed((collapsed) => !collapsed)}
        aria-expanded={!mobileToolsCollapsed}
        aria-label={
          mobileToolsCollapsed ? "Mostrar ferramentas" : "Minimizar ferramentas"
        }
        title={
          mobileToolsCollapsed ? "Mostrar ferramentas" : "Minimizar ferramentas"
        }
      >
        {mobileToolsCollapsed ? (
          <ChevronDown aria-hidden="true" />
        ) : (
          <ChevronUp aria-hidden="true" />
        )}
      </button>
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
