import { CheckCircle2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { localDateKey } from "@/features/tasks/date-utils";
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
  /** Split the list into Atrasadas / Hoje / Próximas / Sem data / Concluídas. */
  grouped?: boolean;
  emptyAction?: React.ReactNode;
}

type Section = { key: string; label: string; tone: string; tasks: Task[] };

function sectionsFor(tasks: Task[]): Section[] {
  const today = localDateKey();
  const buckets: Section[] = [
    { key: "overdue", label: "Atrasadas", tone: "text-destructive", tasks: [] },
    { key: "today", label: "Hoje", tone: "text-violet-400", tasks: [] },
    { key: "upcoming", label: "Próximas", tone: "text-muted-foreground", tasks: [] },
    { key: "undated", label: "Sem data", tone: "text-muted-foreground", tasks: [] },
    { key: "done", label: "Concluídas", tone: "text-emerald-400", tasks: [] },
  ];
  const [overdue, dueToday, upcoming, undated, done] = buckets as [Section, Section, Section, Section, Section];
  tasks.forEach((task) => {
    if (task.status === "completed") done.tasks.push(task);
    else if (!task.due_date) undated.tasks.push(task);
    else if (task.due_date < today) overdue.tasks.push(task);
    else if (task.due_date === today) dueToday.tasks.push(task);
    else upcoming.tasks.push(task);
  });
  // Within a section, timed tasks come first in chronological order.
  const byWhen = (a: Task, b: Task) =>
    `${a.due_date ?? "9"}${a.due_time ?? "99"}`.localeCompare(`${b.due_date ?? "9"}${b.due_time ?? "99"}`);
  [overdue, dueToday, upcoming].forEach((section) => section.tasks.sort(byWhen));
  return buckets.filter((section) => section.tasks.length);
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
  grouped = false,
  emptyAction,
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
        action={emptyAction}
      />
    );
  }

  const renderTask = (task: Task, index: number) => (
    <div
      key={task.id}
      className="flowy-list-item"
      style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
    >
      <TaskItem task={task} folders={folders} categories={categories} compact={compact} />
    </div>
  );

  if (grouped) {
    let index = 0;
    return (
      <div className="space-y-5">
        {sectionsFor(tasks).map((section) => (
          <section key={section.key} aria-label={section.label}>
            <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-widest">
              <span className={section.tone}>{section.label}</span>
              <span className="rounded-full bg-muted px-1.5 py-px text-[10px] tabular-nums text-muted-foreground">
                {section.tasks.length}
              </span>
            </h3>
            {section.tasks.map((task) => renderTask(task, index++))}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Finished tasks sink to the bottom; open ones keep their order. */}
      {[...tasks]
        .sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed"))
        .map(renderTask)}
    </div>
  );
}
