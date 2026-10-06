"use client";

import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function NoteError({ reset }: { reset: () => void }) {
  const router = useRouter();

  return (
    <section className="mx-auto flex min-h-[55dvh] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-semibold">Não foi possível abrir esta nota</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Tente carregar novamente. Se o problema persistir, volte para suas notas e abra outro item.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Tentar novamente
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/app/notes")}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar às notas
        </Button>
      </div>
    </section>
  );
}
