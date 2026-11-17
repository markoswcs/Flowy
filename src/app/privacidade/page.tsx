import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como o Flowy trata os seus dados, inclusive os da sua conta Google.",
};

const UPDATED = "17 de novembro de 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

/** Public privacy policy (also the one linked on Google's consent screen). */
export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-background px-4 pb-16 pt-8 text-foreground">
      <article className="mx-auto w-full max-w-2xl">
        <Link href="/" aria-label="Flowy">
          <Logo />
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Política de privacidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">Atualizada em {UPDATED}.</p>

        <Section title="O que é o Flowy">
          <p>
            O Flowy (useflowy.vercel.app) é um app de tarefas, lembretes e notas. Esta política explica quais dados usamos,
            para quê e como você pode apagá-los.
          </p>
        </Section>

        <Section title="Dados que você coloca no Flowy">
          <p>
            Seu nome e e-mail de cadastro, as tarefas, notas, pastas e etiquetas que você cria e as suas preferências. Se você
            ativar os lembretes, guardamos o endereço técnico do seu aparelho para enviar as notificações. Esses dados servem só
            para o app funcionar para você.
          </p>
        </Section>

        <Section title="Dados da sua conta Google (Agenda e Tarefas)">
          <p>
            Só se você tocar em “Conectar Google Agenda”, o Flowy pede ao Google permissão de <strong>somente leitura</strong>{" "}
            para: ver os compromissos da sua Google Agenda (<code>calendar.readonly</code>), ver as suas Tarefas do Google (
            <code>tasks.readonly</code>) e saber o e-mail da conta conectada.
          </p>
          <p>
            Usamos essas informações apenas para mostrar os seus compromissos e tarefas no calendário do Flowy, para você. O Flowy
            nunca cria, altera ou apaga nada na sua conta Google.
          </p>
          <p>
            Não guardamos os seus compromissos nem as suas tarefas do Google: eles são buscados no momento em que você abre o
            calendário. Guardamos apenas a autorização de acesso (o “token” que o Google fornece) e o e-mail da conta, para não
            pedir a permissão toda vez.
          </p>
          <p>
            Os dados do Google não são vendidos, não são compartilhados com terceiros, não são usados para anúncios e não são
            usados para treinar modelos de inteligência artificial. Nenhuma pessoa lê esses dados, salvo se você pedir ajuda e
            autorizar, ou se a lei exigir.
          </p>
          <p>
            O uso e a transferência, para qualquer outro app, de informações recebidas das APIs do Google pelo Flowy obedecem à{" "}
            <a className="underline" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado.
          </p>
        </Section>

        <Section title="Como desconectar e apagar">
          <p>
            Em Configurações → Agenda do e-mail, toque em <strong>Desconectar</strong>: a autorização é revogada no Google e
            apagada do Flowy na hora. Você também pode remover o acesso em{" "}
            <a className="underline" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
              myaccount.google.com/permissions
            </a>
            .
          </p>
          <p>Ao excluir a sua conta do Flowy (em Configurações), todos os seus dados são apagados, inclusive as conexões com o Google.</p>
        </Section>

        <Section title="Segurança">
          <p>
            Os dados trafegam sempre criptografados (HTTPS). No banco de dados, cada pessoa só tem acesso aos próprios dados, e
            as autorizações do Google ficam numa área que só o servidor do Flowy consegue ler.
          </p>
        </Section>

        <Section title="Serviços que usamos">
          <p>
            Supabase (banco de dados e login), Vercel (hospedagem) e o serviço de notificações do seu navegador ou celular.
            Eles processam os dados só para manter o Flowy funcionando.
          </p>
        </Section>

        <Section title="Contato">
          <p>
            Dúvidas sobre privacidade: escreva para o e-mail de suporte que aparece na tela de permissão do Google ao conectar a
            sua agenda. Se mudarmos esta política, a data no topo é atualizada.
          </p>
        </Section>

        <p className="mt-10 text-sm">
          <Link href="/termos" className="underline">
            Termos de uso
          </Link>
        </p>
      </article>
    </main>
  );
}
