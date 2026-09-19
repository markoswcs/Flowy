import { FolderPage } from "@/features/folders/folder-page";

interface FolderRouteProps {
  params: Promise<{ id: string }>;
}

export default async function FolderRoute({ params }: FolderRouteProps) {
  const { id } = await params;
  return <FolderPage folderId={id} />;
}
