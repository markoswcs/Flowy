import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrashItemKind } from "@/types/productivity";

const mocks = vi.hoisted(() => ({
  getAuthenticatedClient: vi.fn(),
  permanentlyDeleteBoard: vi.fn(),
  permanentlyDeleteCard: vi.fn(),
  permanentlyDeleteCategory: vi.fn(),
  permanentlyDeleteColumn: vi.fn(),
  permanentlyDeleteFolder: vi.fn(),
  permanentlyDeleteNote: vi.fn(),
  permanentlyDeleteTask: vi.fn(),
  restoreCategory: vi.fn(),
  restoreFolder: vi.fn(),
  restoreNote: vi.fn(),
  restoreTask: vi.fn(),
  updateBoard: vi.fn(),
  updateCard: vi.fn(),
  updateColumn: vi.fn(),
}));

vi.mock("@/services/authenticated-client", () => ({
  getAuthenticatedClient: mocks.getAuthenticatedClient,
}));
vi.mock("@/services/categories", () => ({
  permanentlyDeleteCategory: mocks.permanentlyDeleteCategory,
  restoreCategory: mocks.restoreCategory,
}));
vi.mock("@/services/folders", () => ({
  permanentlyDeleteFolder: mocks.permanentlyDeleteFolder,
  restoreFolder: mocks.restoreFolder,
}));
vi.mock("@/services/kanban", () => ({
  permanentlyDeleteBoard: mocks.permanentlyDeleteBoard,
  permanentlyDeleteCard: mocks.permanentlyDeleteCard,
  permanentlyDeleteColumn: mocks.permanentlyDeleteColumn,
  updateBoard: mocks.updateBoard,
  updateCard: mocks.updateCard,
  updateColumn: mocks.updateColumn,
}));
vi.mock("@/services/notes", () => ({
  permanentlyDeleteNote: mocks.permanentlyDeleteNote,
  restoreNote: mocks.restoreNote,
}));
vi.mock("@/services/tasks", () => ({
  permanentlyDeleteTask: mocks.permanentlyDeleteTask,
  restoreTask: mocks.restoreTask,
}));

import {
  listTrashItems,
  permanentlyDeleteTrashItem,
  restoreTrashItem,
} from "@/services/trash";

const deletedAt = "2026-09-18T12:00:00.000Z";
const client = { from: vi.fn() };

function resultFor(table: string) {
  const rows: Record<string, unknown[]> = {
    tasks: [
      {
        id: "task",
        title: "Tarefa",
        description: "Detalhe",
        deleted_at: deletedAt,
      },
    ],
    folders: [{ id: "folder", name: "Pasta", deleted_at: deletedAt }],
    categories: [{ id: "category", name: "Categoria", deleted_at: deletedAt }],
    notes: [
      { id: "note", title: "Nota", plain_text: "Texto", deleted_at: deletedAt },
    ],
    boards: [{ id: "board", name: "Quadro", deleted_at: deletedAt }],
    board_columns: [{ id: "column", name: "Coluna", deleted_at: deletedAt }],
    board_cards: [
      {
        id: "card",
        title: null,
        description: "Card ligado",
        deleted_at: deletedAt,
        task: { title: "Tarefa ligada" },
      },
    ],
  };
  return { data: rows[table], error: null };
}

function queryFor(table: string) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.not.mockResolvedValue(resultFor(table));
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  client.from.mockImplementation((table: string) => queryFor(table));
  mocks.getAuthenticatedClient.mockResolvedValue({
    supabase: client,
    userId: "user",
  });
});

describe("listTrashItems", () => {
  it("returns every soft-deletable entity", async () => {
    const items = await listTrashItems();

    expect(items.map((item) => item.kind).sort()).toEqual(
      ["board", "card", "category", "column", "folder", "note", "task"].sort(),
    );
    expect(items.find((item) => item.kind === "card")?.title).toBe(
      "Tarefa ligada",
    );
  });
});

describe("trash actions", () => {
  const restoreCases: Array<[TrashItemKind, ReturnType<typeof vi.fn>]> = [
    ["task", mocks.restoreTask],
    ["folder", mocks.restoreFolder],
    ["category", mocks.restoreCategory],
    ["note", mocks.restoreNote],
    ["board", mocks.updateBoard],
    ["column", mocks.updateColumn],
    ["card", mocks.updateCard],
  ];

  it.each(restoreCases)("restores %s", async (kind, action) => {
    await restoreTrashItem(kind, "id");
    expect(action).toHaveBeenCalled();
  });

  const deleteCases: Array<[TrashItemKind, ReturnType<typeof vi.fn>]> = [
    ["task", mocks.permanentlyDeleteTask],
    ["folder", mocks.permanentlyDeleteFolder],
    ["category", mocks.permanentlyDeleteCategory],
    ["note", mocks.permanentlyDeleteNote],
    ["board", mocks.permanentlyDeleteBoard],
    ["column", mocks.permanentlyDeleteColumn],
    ["card", mocks.permanentlyDeleteCard],
  ];

  it.each(deleteCases)("permanently deletes %s", async (kind, action) => {
    await permanentlyDeleteTrashItem(kind, "id");
    expect(action).toHaveBeenCalled();
  });
});
