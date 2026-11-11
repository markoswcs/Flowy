import { Circle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";
import { CopyListButton } from "@/features/sharing/copy-list-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SharedList {
  folder_name: string;
  owner_name: string;
  titles: string[];
}

async function readList(token: string): Promise<SharedList | null> {
  if (!/^[0-9a-f]{24}$/.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_list", { p_token: token });
  if (error) return null;
  return ((data ?? []) as SharedList[])[0] ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const list = await readList((await params).token);
  return {
    title: list ? `${list.folder_name} · lista no Flowy` : "Lista não encontrada",
    robots: { index: false },
  };
}

/** A list someone shared: its open tasks, and a button to copy it. */
export default async function SharedListPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const list = await readList(token);

  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <div className="mx-auto w-full max-w-lg">
        <Logo href="/" />
        {list ? (
          <section className="mt-6 rounded-3xl border border-border/60 bg-card/60 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest flowy-ink">
              Lista de {list.owner_name.split(" ")[0]}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{list.folder_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {list.titles.length} {list.titles.length === 1 ? "item" : "itens"}
            </p>
            <ul className="mt-5 space-y-2">
              {list.titles.map((title, index) => (
                <li key={index} className="flex items-start gap-3 rounded-2xl bg-background/50 px-4 py-3">
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm">{title}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <CopyListButton token={token} folderName={list.folder_name} titles={list.titles} />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Vira uma pasta sua, com as mesmas tarefas. Grátis.
              </p>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-border/60 bg-card/60 p-8 text-center">
            <h1 className="text-xl font-semibold">Lista não encontrada</h1>
            <p className="mt-1 text-sm text-muted-foreground">O link pode ter sido desativado por quem compartilhou.</p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium flowy-ink underline-offset-4 hover:underline">
              Conhecer o Flowy
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
