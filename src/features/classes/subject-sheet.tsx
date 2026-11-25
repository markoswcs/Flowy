"use client";

import {
  Clock,
  FileText,
  FolderOpen,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useCreateFolder, useFolders } from "@/features/folders/use-folders";
import { useCreateNote, useNotes } from "@/features/notes/use-notes";
import { holdOverlay } from "@/lib/overlay";
import { toast } from "@/lib/toast";

import { WEEKDAY_NAMES, hhmm, type ClassSlot } from "./schedule";

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const same = (a: string, b: string) =>
  a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");

/**
 * A subject (or any routine item): its times in the week, a button to edit,
 * and its own folder with notes and photos. The folder has the subject's name
 * and is created the first time it is opened.
 */
export function SubjectSheet({
  slot,
  slots,
  color,
  kindLabel,
  onEdit,
  onDelete,
  onClose,
}: {
  slot: ClassSlot;
  slots: ClassSlot[];
  color: string;
  kindLabel: string;
  onEdit: (slot: ClassSlot) => void;
  onDelete: (slot: ClassSlot) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const folders = useFolders();
  const notes = useNotes();
  const createFolder = useCreateFolder();
  const createNote = useCreateNote();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const release = holdOverlay();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const times = slots
    .filter((item) => same(item.name, slot.name))
    .sort(
      (a, b) =>
        WEEK.indexOf(a.weekday) - WEEK.indexOf(b.weekday) ||
        a.starts_at.localeCompare(b.starts_at),
    );
  const folder = (folders.data ?? []).find(
    (item) => !item.deleted_at && same(item.name, slot.name),
  );
  const folderNotes = folder
    ? (notes.data ?? []).filter((note) => note.folder_id === folder.id)
    : [];

  async function ensureFolder() {
    if (folder) return folder.id;
    const created = await createFolder.mutateAsync({
      name: slot.name.trim(),
      color,
    });
    return created.id;
  }

  async function openFolder() {
    setBusy(true);
    try {
      router.push(`/app/folders/${await ensureFolder()}`);
    } catch {
      toast.error("Não foi possível abrir a pasta.");
      setBusy(false);
    }
  }

  async function newNote() {
    setBusy(true);
    try {
      const folderId = await ensureFolder();
      const note = await createNote.mutateAsync({
        folderId,
        title: `${slot.name.trim()} · anotações`,
      });
      router.push(`/app/notes/${note.id}`);
    } catch {
      toast.error("Não foi possível criar a anotação.");
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-title"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 animate-in fade-in bg-black/60"
      />
      <section className="relative max-h-[90dvh] w-full max-w-md animate-in overflow-y-auto rounded-t-[2rem] border border-border/60 bg-card p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl slide-in-from-bottom-8 sm:rounded-[2rem]">
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden"
          aria-hidden="true"
        />
        <div className="flex items-start gap-3">
          <span
            className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color }}
            >
              {kindLabel}
            </p>
            <h2 id="subject-title" className="truncate text-2xl font-bold">
              {slot.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Na semana
        </p>
        <ul className="mt-2 space-y-1.5">
          {times.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <span className="w-16 shrink-0 font-semibold">
                  {WEEKDAY_NAMES[item.weekday]}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                  <Clock className="size-3.5" /> {hhmm(item.starts_at)}–
                  {hhmm(item.ends_at)}
                </span>
                {item.room ? (
                  <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{item.room}</span>
                  </span>
                ) : null}
                <Pencil
                  className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                  aria-label="Editar"
                />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                aria-label={`Excluir ${item.name} de ${WEEKDAY_NAMES[item.weekday]}`}
                className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Pasta da matéria
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Anotações e fotos sobre {slot.name.trim()}. As fotos são comprimidas
          sozinhas.
        </p>
        {folderNotes.length ? (
          <ul className="mt-2 space-y-1.5">
            {folderNotes.slice(0, 4).map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/app/notes/${note.id}`)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border/50 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
                >
                  <FileText className="size-4 shrink-0" style={{ color }} />
                  <span className="truncate">{note.title || "Sem título"}</span>
                </button>
              </li>
            ))}
            {folderNotes.length > 4 ? (
              <li className="px-1 text-xs text-muted-foreground">
                e mais {folderNotes.length - 4} na pasta
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void newNote()}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Nova anotação
          </button>
          <button
            type="button"
            onClick={() => void openFolder()}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-border/60 text-sm font-semibold disabled:opacity-60"
          >
            <FolderOpen className="size-4" style={{ color }} />
            Abrir pasta
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
