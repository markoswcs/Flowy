"use client";

import { PageHeader } from "@/components/ui/page-header";
import { TrashList } from "@/features/trash/components/trash-list";
import { useTrashItems } from "@/features/trash/use-trash";

export function TrashPage() {
  const trashQuery = useTrashItems();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Lixeira"
        description="Itens são excluídos permanentemente após 7 dias."
      />
      <TrashList
        items={trashQuery.data}
        loading={trashQuery.isLoading}
        error={trashQuery.error}
        onRetry={() => void trashQuery.refetch()}
      />
    </div>
  );
}
