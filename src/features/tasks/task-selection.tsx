"use client";

import {
  CheckCheck,
  CheckSquare,
  Flag,
  Folder as FolderIcon,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  useRestoreTask,
  useSoftDeleteTask,
  useUpdateTask,
} from "@/features/tasks/use-tasks";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/providers/notification-provider";
import type { Category, Folder, Task, TaskPriority } from "@/types/productivity";
import { holdOverlay } from "@/lib/overlay";

interface SelectionValue {
  active: boolean;
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  start: (id?: string) => void;
  clear: () => void;
  selectAll: (ids: string[]) => void;
}

const SelectionContext = createContext<SelectionValue | null>(null);

export function useTaskSelection() {
  return useContext(SelectionContext);
}

export function TaskSelectionProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const start = useCallback((id?: string) => {
    setActive(true);
    if (id) setSelected(new Set([id]));
  }, []);
  const clear = useCallback(() => {
    setActive(false);
    setSelected(new Set());
  }, []);
  const selectAll = useCallback((ids: string[]) => setSelected(new Set(ids)), []);

  useEffect(() => {
    if (!active) return;
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [active, clear]);

  const value = useMemo(
    () => ({
      active,
      selected,
      isSelected: (id: string) => selected.has(id),
      toggle,
      start,
      clear,
      selectAll,
    }),
    [active, clear, selectAll, selected, start, toggle],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

type Menu = "folder" | "label" | "priority" | null;

const priorities: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Baixa", color: "text-sky-400" },
  { value: "normal", label: "Normal", color: "text-muted-foreground" },
  { value: "high", label: "Alta", color: "text-destructive" },
];

export function BulkActionBar({
  tasks,
  folders,
  categories,
}: {
  tasks: Task[];
  folders: Folder[];
  categories: Category[];
}) {
  const selection = useTaskSelection();
  const updateTask = useUpdateTask();
  const deleteTask = useSoftDeleteTask();
  const restoreTask = useRestoreTask();
  const { addNotification } = useNotifications();
  const [menu, setMenu] = useState<Menu>(null);
  const [busy, setBusy] = useState(false);

  if (!selection?.active) return null;
  const ids = [...selection.selected];
  const chosen = tasks.filter((task) => selection.selected.has(task.id));
  const count = ids.length;
  const allSelected = count > 0 && count === tasks.length;

  async function run(label: string, action: (task: Task) => Promise<unknown>) {
    if (!chosen.length || !selection) return;
    setBusy(true);
    setMenu(null);
    const results = await Promise.allSettled(chosen.map(action));
    setBusy(false);
    const failed = results.filter((result) => result.status === "rejected").length;
    addNotification({
      title: failed ? `${label}: ${chosen.length - failed} de ${chosen.length}` : label,
      description: failed
        ? "Algumas tarefas não foram alteradas. Tente novamente."
        : `${chosen.length} ${chosen.length === 1 ? "tarefa" : "tarefas"}`,
    });
    selection.clear();
  }

  function trash() {
    const removed = chosen.map((task) => task.id);
    void run("Tarefas movidas para a lixeira", (task) => deleteTask.mutateAsync(task.id)).then(() =>
      addNotification({
        title: "Desfazer exclusão em massa?",
        action: {
          label: "Restaurar tarefas",
          onClick: () => removed.forEach((id) => restoreTask.mutate(id)),
        },
      }),
    );
  }

  // Rendered on <body> so no list card or page layer can paint over it.
  return createPortal(
    <div
      className="fixed inset-x-3 bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5rem)] z-[95] mx-auto max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-300 md:bottom-8"
      role="toolbar"
      aria-label="Ações em massa"
    >
      {menu ? (
        <div className="mb-2 max-h-64 overflow-y-auto rounded-3xl border border-border/70 bg-card/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
          {menu === "folder" ? (
            <>
              <MenuItem onClick={() => void run("Pasta removida", (task) => updateTask.mutateAsync({ id: task.id, folder_id: null }))}>
                <FolderIcon className="size-4 text-muted-foreground" /> Sem pasta
              </MenuItem>
              {folders.map((folder) => (
                <MenuItem
                  key={folder.id}
                  onClick={() =>
                    void run(`Movidas para ${folder.name}`, (task) =>
                      updateTask.mutateAsync({ id: task.id, folder_id: folder.id }),
                    )
                  }
                >
                  <FolderIcon className="size-4" style={{ color: folder.color ?? undefined }} /> {folder.name}
                </MenuItem>
              ))}
            </>
          ) : null}
          {menu === "label"
            ? categories.length
              ? categories.map((category) => (
                  <MenuItem
                    key={category.id}
                    onClick={() =>
                      void run(`Etiqueta ${category.name} adicionada`, (task) =>
                        updateTask.mutateAsync({
                          id: task.id,
                          category_ids: [
                            ...new Set([...task.categories.map((item) => item.id), category.id]),
                          ],
                        }),
                      )
                    }
                  >
                    <Tag className="size-4" style={{ color: category.color }} /> {category.name}
                  </MenuItem>
                ))
              : <p className="px-3 py-4 text-center text-sm text-muted-foreground">Crie uma etiqueta no menu lateral primeiro.</p>
            : null}
          {menu === "priority"
            ? priorities.map((priority) => (
                <MenuItem
                  key={priority.value}
                  onClick={() =>
                    void run(`Prioridade ${priority.label.toLowerCase()}`, (task) =>
                      updateTask.mutateAsync({ id: task.id, priority: priority.value }),
                    )
                  }
                >
                  <Flag className={cn("size-4", priority.color)} /> {priority.label}
                </MenuItem>
              ))
            : null}
        </div>
      ) : null}

      <div className="flex items-center gap-1 rounded-[1.4rem] border border-violet-400/30 bg-card p-1.5 shadow-[0_20px_60px_-15px_rgb(124_58_237/0.55)]">
        <button
          type="button"
          onClick={selection.clear}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Cancelar seleção"
        >
          <X className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => (allSelected ? selection.selectAll([]) : selection.selectAll(tasks.map((task) => task.id)))}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold tabular-nums hover:bg-accent"
          aria-label={allSelected ? "Desmarcar todas" : "Selecionar todas"}
        >
          <CheckSquare className="size-4 text-violet-400" />
          {count}
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            {allSelected ? "· desmarcar" : "· todas"}
          </span>
        </button>
        <div className="ml-auto flex min-w-0 items-center gap-0.5">
          <BarButton
            label="Concluir"
            disabled={!count || busy}
            onClick={() =>
              void run("Tarefas concluídas", (task) =>
                updateTask.mutateAsync({
                  id: task.id,
                  status: "completed",
                  completed_at: new Date().toISOString(),
                }),
              )
            }
          >
            <CheckCheck className="size-4" />
          </BarButton>
          <BarButton label="Pasta" active={menu === "folder"} disabled={!count || busy} onClick={() => setMenu(menu === "folder" ? null : "folder")}>
            <FolderIcon className="size-4" />
          </BarButton>
          <BarButton label="Etiqueta" active={menu === "label"} disabled={!count || busy} onClick={() => setMenu(menu === "label" ? null : "label")}>
            <Tag className="size-4" />
          </BarButton>
          <BarButton label="Prioridade" active={menu === "priority"} disabled={!count || busy} onClick={() => setMenu(menu === "priority" ? null : "priority")}>
            <Flag className="size-4" />
          </BarButton>
          <BarButton label="Excluir" danger disabled={!count || busy} onClick={trash}>
            <Trash2 className="size-4" />
          </BarButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function BarButton({
  label,
  onClick,
  disabled,
  active,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-expanded={active}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-90 disabled:opacity-40 sm:w-auto sm:px-3",
        active && "bg-violet-500/15 text-violet-400",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
    >
      {children}
    </button>
  );
}
