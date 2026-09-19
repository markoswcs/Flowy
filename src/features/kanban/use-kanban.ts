"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  createBoard,
  createCard,
  createColumn,
  getBoard,
  listBoards,
  moveCard,
  reorderColumns,
  updateBoard,
  updateCard,
  updateColumn,
  type CardInput,
} from "@/services/kanban";
import type { Board, BoardCard, BoardWithContent } from "@/types/content";

export const boardKeys = {
  all: ["boards"] as const,
  detail: (id: string) => ["boards", id] as const,
};

export function useBoards() {
  const client = createClient();
  return useQuery({
    queryKey: boardKeys.all,
    queryFn: () => listBoards(client),
  });
}

export function useBoard(boardId: string | null) {
  const client = createClient();
  return useQuery({
    queryKey: boardKeys.detail(boardId ?? "none"),
    queryFn: () => getBoard(client, boardId as string),
    enabled: Boolean(boardId),
  });
}

export function useCreateBoard() {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createBoard(client, name),
    onSuccess: (board) => {
      queryClient.setQueryData<Board[]>(boardKeys.all, (current = []) => [
        ...current,
        board,
      ]);
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(board.id) });
    },
  });
}

export function useUpdateBoard(boardId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: Parameters<typeof updateBoard>[2]) =>
      updateBoard(client, boardId, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useCreateColumn(boardId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; position: number }) =>
      createColumn(client, boardId, input.name, input.position),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

export function useUpdateColumn(boardId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      columnId,
      changes,
    }: {
      columnId: string;
      changes: Parameters<typeof updateColumn>[2];
    }) => updateColumn(client, columnId, changes),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

export function useReorderColumns(boardId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      reorderColumns(client, boardId, orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData<BoardWithContent>(
        boardKeys.detail(boardId),
      );
      if (previous) {
        const byId = new Map(
          previous.columns.map((column) => [column.id, column]),
        );
        queryClient.setQueryData<BoardWithContent>(boardKeys.detail(boardId), {
          ...previous,
          columns: orderedIds
            .map((id) => byId.get(id))
            .filter((column): column is BoardWithContent["columns"][number] =>
              Boolean(column),
            ),
        });
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous)
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

export function useCreateCard(boardId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CardInput) => createCard(client, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

export function useUpdateCard(boardId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      changes,
    }: {
      cardId: string;
      changes: Parameters<typeof updateCard>[2];
    }) => updateCard(client, cardId, changes),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

export function useMoveCard(boardId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      columnId,
      position,
    }: {
      cardId: string;
      columnId: string;
      position: number;
    }) => moveCard(client, cardId, columnId, position),
    onMutate: async ({ cardId, columnId, position }) => {
      await queryClient.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const previous = queryClient.getQueryData<BoardWithContent>(
        boardKeys.detail(boardId),
      );
      if (previous) {
        let moving: BoardCard | undefined;
        const withoutCard = previous.columns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => {
            if (card.id === cardId)
              moving = { ...card, column_id: columnId, position };
            return card.id !== cardId;
          }),
        }));
        if (moving) {
          queryClient.setQueryData<BoardWithContent>(
            boardKeys.detail(boardId),
            {
              ...previous,
              columns: withoutCard.map((column) =>
                column.id === columnId
                  ? {
                      ...column,
                      cards: [...column.cards, moving as BoardCard].sort(
                        (a, b) => a.position - b.position,
                      ),
                    }
                  : column,
              ),
            },
          );
        }
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous)
        queryClient.setQueryData(boardKeys.detail(boardId), context.previous);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}
