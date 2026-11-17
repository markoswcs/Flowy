import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "As regras simples para usar o Flowy.",
};

/** Public terms of use (linked on Google's consent screen). */
export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-background px-4 pb-16 pt-8 text-foreground">
      <article className="mx-auto w-full max-w-2xl space-y-4 text-sm leading-6 text-muted-foreground">
        <Link href="/" aria-label="Flowy">
          <Logo />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Termos de uso</h1>
        <p>Atualizados em 17 de novembro de 2026.</p>
        <p>
          O Flowy é um app gratuito de tarefas, lembretes e notas. Ao usar o Flowy, você concorda em usá-lo de forma legal e em
          não tentar prejudicar o serviço ou outras pessoas (por exemplo, com acessos automatizados em massa ou tentativas de
          invasão).
        </p>
        <p>
          Os conteúdos que você cria são seus. Você pode apagá-los, ou apagar a sua conta inteira, quando quiser, em
          Configurações.
        </p>
        <p>
          Fazemos o possível para o Flowy funcionar sempre e para os lembretes chegarem na hora, mas não podemos garantir que
          nunca haverá falhas. Não use o Flowy como único lembrete de algo crítico (como um remédio).
        </p>
        <p>
          O tratamento dos seus dados está na{" "}
          <Link href="/privacidade" className="underline">
            Política de privacidade
          </Link>
          . Podemos atualizar estes termos; a data acima muda quando isso acontecer.
        </p>
      </article>
    </main>
  );
}
