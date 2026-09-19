"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient } from "@/lib/supabase/client";
import {
  createNote,
  getNote,
  listNotes,
  moveNoteToTrash,
  restoreNote,
  updateNote,
  type NoteChanges,
} from "@/services/notes";
import type { Note } from "@/types/content";

export const noteKeys = {
  all: ["notes"] as const,
  detail: (id: string) => ["notes", id] as const,
};

export function useNotes() {
  const client = createClient();
  return useQuery({
    queryKey: noteKeys.all,
    queryFn: () => listNotes(client),
  });
}

export function useNote(noteId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: noteKeys.detail(noteId),
    queryFn: () => getNote(client, noteId),
    initialData: () =>
      queryClient
        .getQueryData<Note[]>(noteKeys.all)
        ?.find((note) => note.id === noteId),
  });
}

export function useCreateNote() {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: { title?: string; folderId?: string | null }) =>
      createNote(client, input),
    onSuccess: (note) => {
      queryClient.setQueryData<Note[]>(noteKeys.all, (current = []) => [
        note,
        ...current,
      ]);
      queryClient.setQueryData(noteKeys.detail(note.id), note);
    },
  });
}

export function useSaveNote(noteId: string) {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: NoteChanges) => updateNote(client, noteId, changes),
    networkMode: "offlineFirst",
    retry: 3,
    onSuccess: (note) => {
      queryClient.setQueryData(noteKeys.detail(noteId), note);
      queryClient.setQueryData<Note[]>(noteKeys.all, (current = []) =>
        current.map((item) => (item.id === note.id ? note : item)),
      );
    },
  });
}

export function useTrashNote() {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => moveNoteToTrash(client, noteId),
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const previous = queryClient.getQueryData<Note[]>(noteKeys.all);
      queryClient.setQueryData<Note[]>(noteKeys.all, (current = []) =>
        current.filter((note) => note.id !== noteId),
      );
      return { previous };
    },
    onError: (_error, _noteId, context) => {
      if (context?.previous)
        queryClient.setQueryData(noteKeys.all, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useRestoreNote() {
  const client = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => restoreNote(client, noteId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
  });
}
