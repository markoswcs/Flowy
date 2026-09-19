"use client";

import { useState } from "react";
import {
  Columns3,
  FileText,
  Folder,
  LayoutDashboard,
  ListTodo,
  RotateCcw,
  Square,
  Tag,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePermanentlyDeleteTrashItem,
  useRestoreTrashItem,
} from "@/features/trash/use-trash";
import { daysUntilPermanentDeletion } from "@/lib/date";
import type { TrashItem, TrashItemKind } from "@/types/productivity";

interface TrashListProps {
  items: TrashItem[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

const kindLabels: Record<TrashItemKind, string> = {
  task: "Tarefa",
  folder: "Pasta",
  category: "Tag",
  note: "Nota",
  board: "Quadro",
  column: "Coluna",
  card: "Card",
};

function ItemIcon({ kind }: { kind: TrashItemKind }) {
  if (kind === "folder")
    return <Folder className="size-4" aria-hidden="true" />;
  if (kind === "category") return <Tag className="size-4" aria-hidden="true" />;
  if (kind === "note")
    return <FileText className="size-4" aria-hidden="true" />;
  if (kind === "board")
    return <LayoutDashboard className="size-4" aria-hidden="true" />;
  if (kind === "column")
    return <Columns3 className="size-4" aria-hidden="true" />;
  if (kind === "card") return <Square className="size-4" aria-hidden="true" />;
  return <ListTodo className="size-4" aria-hidden="true" />;
}

export function TrashList({ items, loading, error, onRetry }: TrashListProps) {
  const restoreMutation = useRestoreTrashItem();
  const deleteMutation = usePermanentlyDeleteTrashItem();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="divide-y divide-border rounded-lg border border-border">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-3 p-4">
            <Skeleton className="size-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<RotateCcw className="size-5" aria-hidden="true" />}
        title="Não foi possível carregar a lixeira."
        description="Verifique sua conexão e tente novamente."
        action={
          <Button type="button" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (!items?.length) {
    return (
      <EmptyState
        icon={<Trash2 className="size-5" aria-hidden="true" />}
        title="A lixeira está vazia."
        description="Itens excluídos ficam aqui por até 7 dias."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {items.map((item) => {
        const key = `${item.kind}:${item.id}`;
        const days = daysUntilPermanentDeletion(item.deleted_at);
        const isConfirming = confirming === key;
        return (
          <li key={key} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <ItemIcon kind={item.kind} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {kindLabels[item.kind]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {days > 0
                      ? `Será excluído permanentemente em ${days} ${days === 1 ? "dia" : "dias"}.`
                      : "Aguardando exclusão automática."}
                  </p>
                </div>
              </div>

              {isConfirming ? (
                <div
                  className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2"
                  role="group"
                  aria-label={`Confirmar exclusão permanente de ${item.title}`}
                >
                  <span className="px-1 text-xs font-medium text-destructive">
                    Excluir permanentemente?
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    loading={deleteMutation.isPending}
                    onClick={() =>
                      deleteMutation.mutate(item, {
                        onSettled: () => setConfirming(null),
                      })
                    }
                  >
                    Excluir
                  </Button>
                </div>
              ) : (
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={restoreMutation.isPending}
                    onClick={() => restoreMutation.mutate(item)}
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    Restaurar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirming(key)}
                  >
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
