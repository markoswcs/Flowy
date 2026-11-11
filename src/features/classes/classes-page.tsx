"use client";

import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { WEEKDAY_NAMES, hhmm, type ClassSlot, type ClassSlotInput } from "./schedule";
import { useClasses, useDeleteClass, useSaveClass } from "./use-classes";

// Monday first, like a school week.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const EMPTY: ClassSlotInput = { name: "", room: "", weekday: 1, starts_at: "08:00", ends_at: "09:40" };

function ClassForm({
  initial,
  onDone,
}: {
  initial: ClassSlotInput & { id?: string };
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const save = useSaveClass();
  const valid = form.name.trim() && form.ends_at > form.starts_at;

  return (
    <form
      className="space-y-3 rounded-2xl border border-violet-400/30 bg-violet-500/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        save.mutate(form, { onSuccess: onDone });
      }}
    >
      <Input
        autoFocus
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        placeholder="Matéria (ex.: Anatomia)"
        aria-label="Matéria"
        maxLength={80}
      />
      <Input
        value={form.room ?? ""}
        onChange={(event) => setForm({ ...form, room: event.target.value })}
        placeholder="Sala ou local (opcional)"
        aria-label="Sala"
        maxLength={60}
      />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dia da semana">
        {WEEK.map((weekday) => (
          <button
            key={weekday}
            type="button"
            aria-pressed={form.weekday === weekday}
            onClick={() => setForm({ ...form, weekday })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              form.weekday === weekday ? "border-violet-400/60 bg-violet-500/15" : "border-border/60 text-muted-foreground",
            )}
          >
            {WEEKDAY_NAMES[weekday]!.slice(0, 3)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">
          Começa
          <Input type="time" value={hhmm(form.starts_at)} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
        </label>
        <label className="text-xs text-muted-foreground">
          Termina
          <Input type="time" value={hhmm(form.ends_at)} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} />
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 flex-1" disabled={!valid} loading={save.isPending}>
          Salvar aula
        </Button>
        <Button type="button" variant="ghost" className="h-11" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** The fixed weekly classes, shown as "Agora" / "Próxima" on the Hoje view. */
export function ClassesPage() {
  const classes = useClasses();
  const remove = useDeleteClass();
  const [editing, setEditing] = useState<(ClassSlotInput & { id?: string }) | null>(null);
  const slots = classes.data ?? [];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
            <GraduationCap className="size-6 flowy-ink" aria-hidden="true" />
            Grade de aulas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre uma vez. No Hoje aparece a aula de agora e a próxima.
          </p>
        </div>
        {!editing ? (
          <Button type="button" className="h-11 gap-2" onClick={() => setEditing(EMPTY)}>
            <Plus className="size-4" />
            Adicionar aula
          </Button>
        ) : null}
      </header>

      {editing && !editing.id ? <ClassForm initial={editing} onDone={() => setEditing(null)} /> : null}

      {classes.isLoading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : !slots.length && !editing ? (
        <section className="rounded-3xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Nenhuma aula ainda. Toque em <span className="font-medium text-foreground">Adicionar aula</span> para montar sua semana.
        </section>
      ) : (
        WEEK.map((weekday) => {
          const day = slots.filter((slot) => slot.weekday === weekday);
          if (!day.length) return null;
          return (
            <section key={weekday} aria-label={WEEKDAY_NAMES[weekday]}>
              <h2 className="mb-2 text-sm font-semibold">{WEEKDAY_NAMES[weekday]}</h2>
              <ul className="space-y-2">
                {day.map((slot: ClassSlot) =>
                  editing?.id === slot.id ? (
                    <li key={slot.id}>
                      <ClassForm initial={editing} onDone={() => setEditing(null)} />
                    </li>
                  ) : (
                    <li key={slot.id} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-3">
                      <span className="w-24 shrink-0 text-sm font-semibold tabular-nums flowy-ink">
                        {hhmm(slot.starts_at)}–{hhmm(slot.ends_at)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{slot.name}</span>
                        {slot.room ? <span className="block truncate text-xs text-muted-foreground">{slot.room}</span> : null}
                      </span>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${slot.name}`} onClick={() => setEditing(slot)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Apagar ${slot.name}`}
                        onClick={() => remove.mutate(slot.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ),
                )}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
