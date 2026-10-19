import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createMap } from "@/features/mindmap/model";
import type { MapDoc } from "@/features/mindmap/types";
import { MapWorkspace } from "@/features/mindmap/components/map-workspace";

const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: true,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as HTMLCanvasElement["getContext"];
});

afterEach(cleanup);

afterAll(() => {
  vi.unstubAllGlobals();
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

function Harness({ initial, onCommit }: { initial: MapDoc; onCommit?: (doc: MapDoc) => void }) {
  const [doc, setDoc] = useState(initial);
  return (
    <MapWorkspace
      doc={doc}
      title="Teste"
      canUndo={false}
      canRedo={false}
      commit={(next) => {
        onCommit?.(next);
        setDoc(next);
      }}
      undo={() => {}}
      redo={() => {}}
      onTrash={() => {}}
    />
  );
}

function topics() {
  return within(screen.getByRole("tree", { name: "Mapa" })).getAllByRole(
    "treeitem",
  );
}

describe("MapWorkspace", () => {
  it("renders every topic of the map", () => {
    render(<Harness initial={createMap("Ideia", "blank")} />);
    expect(topics()).toHaveLength(4);
    expect(screen.getByRole("treeitem", { name: "Ideia" })).toBeInTheDocument();
  });

  it("creates a subtopic with Tab and confirms its text with Enter", () => {
    render(<Harness initial={createMap("Ideia", "blank")} />);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.getByRole("treeitem", { name: "Ideia" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(document.body, { key: "Tab" });
    const field = screen.getByLabelText("Texto do tópico");
    fireEvent.change(field, { target: { value: "Novo ramo" } });
    act(() => {
      fireEvent.keyDown(field, { key: "Enter" });
    });

    expect(topics()).toHaveLength(5);
    expect(screen.getByRole("treeitem", { name: "Novo ramo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("deletes the selected topic but never the root", () => {
    render(<Harness initial={createMap("Ideia", "blank")} />);
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    fireEvent.keyDown(document.body, { key: "Delete" });
    expect(topics()).toHaveLength(4);

    fireEvent.keyDown(document.body, { key: "Tab" });
    fireEvent.keyDown(screen.getByLabelText("Texto do tópico"), {
      key: "Escape",
    });
    expect(topics()).toHaveLength(5);
    fireEvent.keyDown(document.body, { key: "Delete" });
    expect(topics()).toHaveLength(4);
  });

  describe("touch", () => {
    // jsdom has no PointerEvent, so pointerType would be lost.
    beforeAll(() => {
      class TestPointerEvent extends MouseEvent {
        pointerId: number;
        pointerType: string;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 1;
          this.pointerType = init.pointerType ?? "mouse";
        }
      }
      vi.stubGlobal("PointerEvent", TestPointerEvent);
    });

    function touch(target: Element, moveBy = 0) {
      const base = { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100, button: 0 };
      fireEvent.pointerDown(target, base);
      if (moveBy) fireEvent.pointerMove(target, { ...base, clientX: 100 + moveBy });
      fireEvent.pointerUp(target, { ...base, clientX: 100 + moveBy });
    }

    it("selects on the first tap and edits on the second", () => {
      render(<Harness initial={createMap("Ideia", "blank")} />);
      const [, branch] = topics();
      touch(branch!);
      expect(branch).toHaveAttribute("aria-selected", "true");
      expect(screen.queryByLabelText("Texto do tópico")).not.toBeInTheDocument();
      touch(branch!);
      expect(screen.getByLabelText("Texto do tópico")).toBeInTheDocument();
    });

    it("pans instead of dragging when a swipe starts on an unselected topic", () => {
      const onCommit = vi.fn();
      render(<Harness initial={createMap("Ideia", "blank")} onCommit={onCommit} />);
      const [, branch] = topics();
      touch(branch!, 60);
      expect(onCommit).not.toHaveBeenCalled();
      expect(branch).toHaveAttribute("aria-selected", "false");

      // Once selected, the same swipe moves the topic.
      touch(branch!);
      touch(branch!, 60);
      expect(onCommit).toHaveBeenCalled();
    });

    it("adds a topic from the dock button", () => {
      render(<Harness initial={createMap("Ideia", "blank")} />);
      fireEvent.click(screen.getByRole("button", { name: "Adicionar tópico" }));
      expect(topics()).toHaveLength(5);
    });
  });
});
