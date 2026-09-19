import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizedPositions } from "@/lib/positions";
import type {
  Board,
  BoardCard,
  BoardColumn,
  BoardWithContent,
  TaskStatus,
} from "@/types/content";

async function authenticatedUserId(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw error ?? new Error("Sessão expirada.");
  return data.user.id;
}

export async function listBoards(client: SupabaseClient): Promise<Board[]> {
  const { data, error } = await client
    .from("boards")
    .select("*")
    .is("deleted_at", null)
    .order("position");
  if (error) throw error;
  return (data ?? []) as Board[];
}

export async function getBoard(
  client: SupabaseClient,
  boardId: string,
): Promise<BoardWithContent> {
  const [boardResult, columnResult, cardResult] = await Promise.all([
    client
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .is("deleted_at", null)
      .single(),
    client
      .from("board_columns")
      .select("*")
      .eq("board_id", boardId)
      .is("deleted_at", null)
      .order("position"),
    client
      .from("board_cards")
      .select("*, task:tasks(id,title,status,completed_at)")
      .eq("board_id", boardId)
      .is("deleted_at", null)
      .order("position"),
  ]);

  if (boardResult.error) throw boardResult.error;
  if (columnResult.error) throw columnResult.error;
  if (cardResult.error) throw cardResult.error;

  const board = boardResult.data as Board;
  const cards = (cardResult.data ?? []) as unknown as BoardCard[];
  const columns = ((columnResult.data ?? []) as BoardColumn[]).map(
    (column) => ({
      ...column,
      cards: cards.filter((card) => card.column_id === column.id),
    }),
  );
  return { ...board, columns };
}

export async function createBoard(
  client: SupabaseClient,
  name: string,
): Promise<Board> {
  const { data: rpcData, error: rpcError } = await client.rpc(
    "create_board_with_defaults",
    { board_name: name.trim() || "Novo quadro" },
  );

  if (!rpcError && rpcData) {
    const boardId = typeof rpcData === "string" ? rpcData : String(rpcData);
    const { data, error } = await client
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .single();
    if (error) throw error;
    return data as Board;
  }

  // The fallback keeps development environments usable before the latest
  // migration is applied. RLS still enforces ownership for every write.
  const userId = await authenticatedUserId(client);
  const { data: board, error } = await client
    .from("boards")
    .insert({
      user_id: userId,
      name: name.trim() || "Novo quadro",
      position: Date.now(),
    })
    .select("*")
    .single();
  if (error) throw error;

  const defaults: Array<[string, TaskStatus]> = [
    ["A fazer", "todo"],
    ["Em andamento", "in_progress"],
    ["Concluído", "completed"],
  ];
  const { error: columnError } = await client.from("board_columns").insert(
    defaults.map(([columnName, status], index) => ({
      board_id: board.id,
      user_id: userId,
      name: columnName,
      semantic_status: status,
      position: (index + 1) * 1_000,
    })),
  );
  if (columnError) {
    await client
      .from("boards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", board.id);
    await client
      .from("boards")
      .delete()
      .eq("id", board.id)
      .not("deleted_at", "is", null);
    throw columnError;
  }
  return board as Board;
}

export async function updateBoard(
  client: SupabaseClient,
  boardId: string,
  changes: Pick<Partial<Board>, "name" | "position" | "deleted_at">,
): Promise<void> {
  const { error } = await client
    .from("boards")
    .update(changes)
    .eq("id", boardId);
  if (error) throw error;
}

export async function permanentlyDeleteBoard(
  client: SupabaseClient,
  boardId: string,
): Promise<void> {
  const { error } = await client
    .from("boards")
    .delete()
    .eq("id", boardId)
    .not("deleted_at", "is", null);
  if (error) throw error;
}

export async function createColumn(
  client: SupabaseClient,
  boardId: string,
  name: string,
  position: number,
): Promise<BoardColumn> {
  const userId = await authenticatedUserId(client);
  const { data, error } = await client
    .from("board_columns")
    .insert({ board_id: boardId, user_id: userId, name: name.trim(), position })
    .select("*")
    .single();
  if (error) throw error;
  return data as BoardColumn;
}

export async function updateColumn(
  client: SupabaseClient,
  columnId: string,
  changes: Pick<
    Partial<BoardColumn>,
    "name" | "position" | "semantic_status" | "deleted_at"
  >,
): Promise<void> {
  const { error } = await client
    .from("board_columns")
    .update(changes)
    .eq("id", columnId);
  if (error) throw error;
}

export async function reorderColumns(
  client: SupabaseClient,
  boardId: string,
  orderedIds: string[],
): Promise<void> {
  const { error: rpcError } = await client.rpc("reorder_board_columns", {
    target_board_id: boardId,
    ordered_column_ids: orderedIds,
  });
  if (!rpcError) return;

  const positions = normalizedPositions(orderedIds.length);
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from("board_columns")
        .update({ position: positions[index] })
        .eq("id", id),
    ),
  );
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
}

export interface CardInput {
  boardId: string;
  columnId: string;
  title: string;
  description?: string | null;
  taskId?: string | null;
  position: number;
}

export async function createCard(
  client: SupabaseClient,
  input: CardInput,
): Promise<BoardCard> {
  const userId = await authenticatedUserId(client);
  const { data, error } = await client
    .from("board_cards")
    .insert({
      user_id: userId,
      board_id: input.boardId,
      column_id: input.columnId,
      task_id: input.taskId ?? null,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      position: input.position,
    })
    .select("*, task:tasks(id,title,status,completed_at)")
    .single();
  if (error) throw error;
  return data as unknown as BoardCard;
}

export async function updateCard(
  client: SupabaseClient,
  cardId: string,
  changes: Pick<
    Partial<BoardCard>,
    "title" | "description" | "task_id" | "deleted_at"
  >,
): Promise<void> {
  const { error } = await client
    .from("board_cards")
    .update(changes)
    .eq("id", cardId);
  if (error) throw error;
}

export async function moveCard(
  client: SupabaseClient,
  cardId: string,
  columnId: string,
  position: number,
): Promise<void> {
  const { error } = await client.rpc("move_board_card", {
    target_card_id: cardId,
    target_column_id: columnId,
    target_position: position,
  });
  if (!error) return;

  const { error: updateError } = await client
    .from("board_cards")
    .update({ column_id: columnId, position })
    .eq("id", cardId);
  if (updateError) throw updateError;
}

export async function permanentlyDeleteCard(
  client: SupabaseClient,
  cardId: string,
): Promise<void> {
  const { error } = await client
    .from("board_cards")
    .delete()
    .eq("id", cardId)
    .not("deleted_at", "is", null);
  if (error) throw error;
}

export async function permanentlyDeleteColumn(
  client: SupabaseClient,
  columnId: string,
): Promise<void> {
  const { error } = await client
    .from("board_columns")
    .delete()
    .eq("id", columnId)
    .not("deleted_at", "is", null);
  if (error) throw error;
}
