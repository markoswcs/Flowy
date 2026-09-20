import { Skeleton } from "@/components/ui/skeleton";

export default function NoteLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" aria-label="Carregando nota">
      <div className="flex items-center justify-between">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-8 w-28" />
      </div>
      <Skeleton className="h-11 w-2/3 max-w-full" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-4/5" />
      </div>
    </div>
  );
}
