import { Skeleton } from "@/components/ui/skeleton";

export default function FolderLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8" aria-label="Carregando pasta">
      <div className="space-y-3">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-5 w-36" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}
