"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { createFolder } from "@/services/folders";
import { createTask } from "@/services/tasks";

/** Copies a shared list into the signed-in person's Flowy, as a new folder. */
export function CopyListButton({ token, folderName, titles }: { token: string; folderName: string; titles: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function copy() {
    setBusy(true);
    try {
      const { data } = await createClient().auth.getClaims();
      if (!data?.claims?.sub) {
        router.push(`/login?next=${encodeURIComponent(`/lista/${token}`)}`);
        return;
      }
      const folder = await createFolder({ name: folderName.slice(0, 80) });
      // In order, one by one, so they keep the list's order.
      for (const [index, title] of titles.entries()) {
        await createTask({ title, folder_id: folder.id, position: Date.now() + index });
      }
      router.push(`/app/folders/${folder.id}`);
    } catch {
      toast.error("Não foi possível copiar a lista.");
      setBusy(false);
    }
  }

  return (
    <Button type="button" className="h-12 w-full text-base" loading={busy} onClick={() => void copy()} disabled={!titles.length}>
      Copiar para o meu Flowy
    </Button>
  );
}
