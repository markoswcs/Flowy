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

function Harness({ initial }: { initial: MapDoc }) {
  const [doc, setDoc] = useState(initial);
  return (
    <MapWorkspace
      doc={doc}
      title="Teste"
      canUndo={false}
      canRedo={false}
      commit={setDoc}
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
});
