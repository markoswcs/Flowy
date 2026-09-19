import { NoteEditor } from "@/features/notes/note-editor";

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  return <NoteEditor noteId={noteId} />;
}
