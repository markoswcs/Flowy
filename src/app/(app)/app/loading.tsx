import Image from "next/image";

export default function AppLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center" aria-label="Carregando o Flowy">
      <div className="flowy-loader-orbit relative grid size-24 place-items-center rounded-[2rem] border border-primary/20 bg-primary/10">
        <Image src="/logo.png" alt="" width={58} height={58} priority className="flowy-loader-logo object-contain" />
      </div>
      <h1 className="mt-7 text-xl font-semibold tracking-tight">Preparando seu espaço</h1>
      <p className="mt-2 text-sm text-muted-foreground">Organizando suas tarefas, notas e ideias.</p>
      <div className="flowy-loader-progress mt-6 h-1 w-36 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span /></div>
    </div>
  );
}
