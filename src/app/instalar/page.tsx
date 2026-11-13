import { BellRing, Monitor, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { InstallVideo } from "@/components/system/install-video";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Como instalar o Flowy e receber os lembretes",
  description: "Vídeo de 40 segundos: instale o Flowy no iPhone ou no Android e ative os avisos de cada tarefa.",
};

const WHY = [
  {
    icon: Smartphone,
    title: "Por que instalar?",
    body: "O Flowy é um site. Instalado, ele vira um app na tela do celular, e só assim o iPhone e o Android deixam ele mandar notificação.",
  },
  {
    icon: BellRing,
    title: "E o “Permitir”?",
    body: "Depois de instalar, toque em Ativar lembretes e em Permitir. Sem isso o celular bloqueia o aviso.",
  },
  {
    icon: Monitor,
    title: "No computador",
    body: "Use o Chrome ou o Edge e clique em Instalar, na barra de endereço. Em outros navegadores, deixe o Flowy aberto numa aba: os avisos aparecem na hora.",
  },
];

/** Public page to send to anyone: the install video and why it matters. */
export default function InstallPage() {
  return (
    <main className="min-h-dvh bg-background px-4 pb-16 pt-8 text-foreground">
      <div className="mx-auto w-full max-w-lg">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="Flowy">
          <Logo />
        </Link>
        <h1 className="mt-6 text-balance text-3xl font-bold tracking-tight">
          Receba o aviso de cada tarefa no seu celular
        </h1>
        <p className="mt-2 text-muted-foreground">
          Instale o Flowy e ative os lembretes. Leva menos de 1 minuto, veja como:
        </p>

        <InstallVideo className="mt-6" />

        <ul className="mt-8 space-y-3">
          {WHY.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3 rounded-2xl border border-border/60 bg-card/50 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl flowy-active">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm">
                <strong className="block font-semibold">{title}</strong>
                <span className="text-muted-foreground">{body}</span>
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/app"
          className="mt-8 flex h-12 items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Abrir o Flowy
        </Link>
      </div>
    </main>
  );
}
