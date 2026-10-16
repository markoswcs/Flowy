import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingPage } from "@/features/landing/landing-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { absolute: "Flowy · Sua mente, em fluxo" },
  description:
    "Tarefas, notas, fluxogramas e mapas mentais em um só lugar. Escreva do seu jeito e organize seu dia com clareza.",
  robots: { index: true, follow: true },
};

export default async function IndexPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  // Signed-in people (and the installed app) go straight to their workspace.
  if (data?.claims) redirect("/app");

  return <LandingPage />;
}
