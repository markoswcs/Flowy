import { Skeleton } from "@/components/ui/skeleton";

// A light skeleton keeps navigation feeling instant instead of flashing a
// full-screen loader between pages.
export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" aria-label="Carregando" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
