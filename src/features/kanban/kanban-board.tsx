"use client";

import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
} from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  KanbanSquare,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { KanbanColumnView } from "@/features/kanban/kanban-column";
import {
  useBoard,
  useBoards,
  useCreateBoard,
  useCreateCard,
  useCreateColumn,
  useMoveCard,
  useReorderColumns,
  useUpdateBoard,
  useUpdateCard,
  useUpdateColumn,
} from "@/features/kanban/use-kanban";
import { createClient } from "@/lib/supabase/client";
import { positionBetween } from "@/lib/positions";
import type { BoardCard } from "@/types/content";

interface DragMeta {
  type: "column" | "card";
  columnId: string;
  cardId?: string;
}

export function KanbanBoard() {
  const client = useMemo(() => createClient(), []);
  const boards = useBoards();
  const [preferredBoardId, setPreferredBoardId] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("flowy:last-board"),
  );
  const selectedId =
    boards.data?.find((item) => item.id === preferredBoardId)?.id ??
    boards.data?.[0]?.id ??
    null;
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const board = useBoard(selectedId);
  const createBoardMutation = useCreateBoard();
  const updateBoardMutation = useUpdateBoard(selectedId ?? "none");
  const createColumnMutation = useCreateColumn(selectedId ?? "none");
  const updateColumnMutation = useUpdateColumn(selectedId ?? "none");
  const reorderColumnMutation = useReorderColumns(selectedId ?? "none");
  const createCardMutation = useCreateCard(selectedId ?? "none");
  const updateCardMutation = useUpdateCard(selectedId ?? "none");
  const moveCardMutation = useMoveCard(selectedId ?? "none");

  const tasks = useQuery({
    queryKey: ["tasks", "kanban-picker"],
    queryFn: async () => {
      const { data, error } = await client
        .from("tasks")
        .select("id,title")
        .is("deleted_at", null)
        .neq("status", "completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string }>;
    },
  });

  function selectBoard(boardId: string | null) {
    setPreferredBoardId(boardId);
    if (boardId) window.localStorage.setItem("flowy:last-board", boardId);
    else window.localStorage.removeItem("flowy:last-board");
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function createNewBoard(event: React.FormEvent) {
    event.preventDefault();
    if (!boardName.trim()) return;
    try {
      const created = await createBoardMutation.mutateAsync(boardName);
      selectBoard(created.id);
      setBoardName("");
      setCreatingBoard(false);
      toast.success("Quadro criado.");
    } catch {
      toast.error("Não foi possível criar o quadro.");
    }
  }

  async function renameBoard(event: React.FormEvent) {
    event.preventDefault();
    if (!board.data || !boardName.trim()) return;
    try {
      await updateBoardMutation.mutateAsync({ name: boardName.trim() });
      setRenamingBoard(false);
      toast.success("Quadro renomeado.");
    } catch {
      toast.error("Não foi possível renomear o quadro.");
    }
  }

  async function trashBoard() {
    if (!board.data) return;
    const previousBoard = board.data;
    try {
      await updateBoardMutation.mutateAsync({
        deleted_at: new Date().toISOString(),
      });
      selectBoard(
        boards.data?.find((item) => item.id !== previousBoard.id)?.id ?? null,
      );
      toast("Quadro movido para a lixeira.", {
        action: {
          label: "Desfazer",
          onClick: () => updateBoardMutation.mutate({ deleted_at: null }),
        },
      });
    } catch {
      toast.error("Não foi possível excluir o quadro.");
    }
  }

  async function addColumn(event: React.FormEvent) {
    event.preventDefault();
    if (!board.data || !newColumnName.trim()) return;
    const lastPosition = board.data.columns.at(-1)?.position ?? 0;
    try {
      await createColumnMutation.mutateAsync({
        name: newColumnName.trim(),
        position: lastPosition + 1_000,
      });
      setNewColumnName("");
    } catch {
      toast.error("Não foi possível criar a coluna.");
    }
  }

  function trashColumn(columnId: string, cardCount: number) {
    if (cardCount > 0) {
      toast.error("Mova ou exclua os cards antes de excluir a coluna.");
      return;
    }
    updateColumnMutation.mutate(
      { columnId, changes: { deleted_at: new Date().toISOString() } },
      {
        onSuccess: () =>
          toast("Coluna excluída.", {
            action: {
              label: "Desfazer",
              onClick: () =>
                updateColumnMutation.mutate({
                  columnId,
                  changes: { deleted_at: null },
                }),
            },
          }),
        onError: () => toast.error("Não foi possível excluir a coluna."),
      },
    );
  }

  function trashCard(card: BoardCard) {
    updateCardMutation.mutate(
      { cardId: card.id, changes: { deleted_at: new Date().toISOString() } },
      {
        onSuccess: () =>
          toast("Card movido para a lixeira.", {
            action: {
              label: "Desfazer",
              onClick: () =>
                updateCardMutation.mutate({
                  cardId: card.id,
                  changes: { deleted_at: null },
                }),
            },
          }),
        onError: () => toast.error("Não foi possível excluir o card."),
      },
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!board.data || !event.over) return;
    const active = event.active.data.current as DragMeta | undefined;
    const over = event.over.data.current as DragMeta | undefined;
    if (!active || !over) return;

    if (
      active.type === "column" &&
      over.type === "column" &&
      active.columnId !== over.columnId
    ) {
      const oldIndex = board.data.columns.findIndex(
        (column) => column.id === active.columnId,
      );
      const newIndex = board.data.columns.findIndex(
        (column) => column.id === over.columnId,
      );
      if (oldIndex < 0 || newIndex < 0) return;
      const reordered = arrayMove(board.data.columns, oldIndex, newIndex);
      reorderColumnMutation.mutate(
        reordered.map((column) => column.id),
        {
          onError: () => toast.error("Não foi possível reordenar as colunas."),
        },
      );
      return;
    }

    if (active.type !== "card" || !active.cardId) return;
    const sourceColumn = board.data.columns.find(
      (column) => column.id === active.columnId,
    );
    const targetColumnId =
      over.type === "column" ? over.columnId : over.columnId;
    const targetColumn = board.data.columns.find(
      (column) => column.id === targetColumnId,
    );
    if (!sourceColumn || !targetColumn) return;

    const sourceIndex = sourceColumn.cards.findIndex(
      (card) => card.id === active.cardId,
    );
    const originalOverIndex = over.cardId
      ? targetColumn.cards.findIndex((card) => card.id === over.cardId)
      : targetColumn.cards.length;
    const candidates = targetColumn.cards.filter(
      (card) => card.id !== active.cardId,
    );
    let insertIndex = over.cardId
      ? candidates.findIndex((card) => card.id === over.cardId)
      : candidates.length;
    if (insertIndex < 0) insertIndex = candidates.length;
    if (sourceColumn.id === targetColumn.id && sourceIndex < originalOverIndex)
      insertIndex += 1;
    insertIndex = Math.min(insertIndex, candidates.length);
    const position = positionBetween(
      candidates[insertIndex - 1]?.position,
      candidates[insertIndex]?.position,
    );
    moveCardMutation.mutate(
      { cardId: active.cardId, columnId: targetColumn.id, position },
      {
        onSuccess: () => toast.success("Card movido."),
        onError: () => toast.error("Não foi possível mover o card."),
      },
    );
  }

  if (boards.isLoading)
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="sr-only">Carregando quadros</span>
      </div>
    );

  if (boards.isError)
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-sm text-destructive">
          Não foi possível carregar seus quadros.
        </p>
        <button
          onClick={() => boards.refetch()}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );

  if (!boards.data?.length && !creatingBoard) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <KanbanSquare className="mb-4 size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold">
          Organize seu trabalho visualmente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie um quadro para começar.
        </p>
        <button
          type="button"
          onClick={() => setCreatingBoard(true)}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" /> Criar quadro
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        {boards.data && boards.data.length > 0 && (
          <div className="relative">
            <select
              value={selectedId ?? ""}
              onChange={(event) => selectBoard(event.target.value)}
              className="min-h-10 appearance-none rounded-lg border border-input bg-background py-2 pl-3 pr-9 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
              aria-label="Quadro ativo"
            >
              {boards.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setCreatingBoard(true);
            setBoardName("");
          }}
          className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Criar quadro"
        >
          <Plus className="size-4" />
        </button>
        {board.data && (
          <details className="relative ml-auto">
            <summary
              className="grid size-10 cursor-pointer list-none place-items-center rounded-lg text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Opções do quadro"
            >
              <MoreHorizontal className="size-4" />
            </summary>
            <div className="absolute right-0 top-11 z-40 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setBoardName(board.data.name);
                  setRenamingBoard(true);
                }}
                className="flex min-h-10 w-full items-center rounded-md px-3 text-sm hover:bg-accent"
              >
                Renomear
              </button>
              <button
                type="button"
                onClick={trashBoard}
                className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" /> Excluir quadro
              </button>
            </div>
          </details>
        )}
      </header>

      {(creatingBoard || renamingBoard) && (
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
          <form
            onSubmit={renamingBoard ? renameBoard : createNewBoard}
            className="flex max-w-md items-center gap-2"
          >
            <label className="sr-only" htmlFor="board-name">
              Nome do quadro
            </label>
            <input
              id="board-name"
              value={boardName}
              onChange={(event) => setBoardName(event.target.value)}
              autoFocus
              placeholder="Nome do quadro"
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              disabled={!boardName.trim() || createBoardMutation.isPending}
              className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              aria-label="Salvar quadro"
            >
              {createBoardMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatingBoard(false);
                setRenamingBoard(false);
              }}
              className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
              aria-label="Cancelar"
            >
              <X className="size-4" />
            </button>
          </form>
        </div>
      )}

      {board.isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : board.data ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-1 snap-x items-start gap-3 overflow-x-auto overscroll-x-contain p-4 pb-8 sm:p-6">
            <SortableContext
              items={board.data.columns.map((column) => `column:${column.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {board.data.columns.map((column) => (
                <div key={column.id} className="snap-start">
                  <KanbanColumnView
                    column={column}
                    tasks={tasks.data ?? []}
                    onCreateCard={async ({ title, taskId }) => {
                      const lastPosition = column.cards.at(-1)?.position ?? 0;
                      try {
                        await createCardMutation.mutateAsync({
                          boardId: board.data.id,
                          columnId: column.id,
                          title,
                          taskId,
                          position: lastPosition + 1_000,
                        });
                      } catch {
                        toast.error("Não foi possível criar o card.");
                      }
                    }}
                    onUpdateCard={async (cardId, changes) => {
                      try {
                        await updateCardMutation.mutateAsync({
                          cardId,
                          changes,
                        });
                        toast.success("Card salvo.");
                      } catch {
                        toast.error("Não foi possível salvar o card.");
                        throw new Error("card-update-failed");
                      }
                    }}
                    onTrashCard={trashCard}
                    onRename={async (name) => {
                      try {
                        await updateColumnMutation.mutateAsync({
                          columnId: column.id,
                          changes: { name },
                        });
                      } catch {
                        toast.error("Não foi possível renomear a coluna.");
                      }
                    }}
                    onTrash={() => trashColumn(column.id, column.cards.length)}
                  />
                </div>
              ))}
            </SortableContext>
            <form
              onSubmit={addColumn}
              className="w-[84vw] max-w-80 shrink-0 snap-start rounded-xl border border-dashed border-border p-2.5 sm:w-80"
            >
              <label className="sr-only" htmlFor="new-column">
                Nome da nova coluna
              </label>
              <input
                id="new-column"
                value={newColumnName}
                onChange={(event) => setNewColumnName(event.target.value)}
                placeholder="Nova coluna"
                className="min-h-10 w-full bg-transparent px-2 text-sm outline-none"
              />
              <button
                disabled={!newColumnName.trim()}
                className="mt-1 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-medium text-accent-foreground disabled:opacity-50"
              >
                <Plus className="size-4" /> Adicionar coluna
              </button>
            </form>
          </div>
        </DndContext>
      ) : null}
    </div>
  );
}
