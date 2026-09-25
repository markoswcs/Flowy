import { CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category, Folder, Task } from "@/types/productivity";

import { TaskItem } from "./task-item";

interface TaskListProps {
  tasks: Task[] | undefined;
  folders?: Folder[];
  categories?: Category[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  compact?: boolean;
}

export function TaskList({
  tasks,
  folders = [],
  categories = [],
  loading = false,
  error,
  onRetry,
  emptyTitle = "Você ainda não tem tarefas.",
  emptyDescription,
  compact = false,
}: TaskListProps) {
  if (loading) {
    return (
      <div className="divide-y divide-border" aria-label="Carregando tarefas">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex items-center gap-3 px-3 py-4">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
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
        title="Não foi possível carregar as tarefas."
        description="Verifique sua conexão e tente novamente."
        action={
          onRetry ? (
            <Button type="button" variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          ) : null
        }
      />
    );
  }

  if (!tasks?.length) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="size-5" aria-hidden="true" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div>
      {tasks.map((task, index) => (
        <div
          key={task.id}
          className="flowy-list-item"
          style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
        >
          <TaskItem
            task={task}
            folders={folders}
            categories={categories}
            compact={compact}
          />
        </div>
      ))}
    </div>
  );
}
