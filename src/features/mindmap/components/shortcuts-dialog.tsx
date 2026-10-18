"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Tópicos",
    items: [
      ["Tab", "Subtópico"],
      ["Enter", "Tópico irmão (Shift+Enter: acima)"],
      ["Shift+Tab / Ctrl+Enter", "Tópico pai"],
      ["F2 ou digitar", "Editar texto"],
      ["Delete", "Excluir"],
      ["Ctrl+D", "Duplicar"],
      ["Alt+↑ / Alt+↓", "Mover entre irmãos"],
      ["Espaço", "Recolher / expandir ramo"],
      ["Duplo clique no fundo", "Tópico flutuante"],
    ],
  },
  {
    title: "Seleção e estilo",
    items: [
      ["Setas", "Navegar"],
      ["Shift+clique", "Somar à seleção"],
      ["Shift+arrastar no fundo", "Selecionar área"],
      ["Ctrl+A", "Selecionar tudo"],
      ["Ctrl+B / Ctrl+I", "Negrito / itálico"],
      ["Ctrl+Alt+C / Ctrl+Alt+V", "Copiar / colar estilo"],
      ["Ctrl+Shift+B", "Limite em volta do ramo"],
      ["Ctrl+C / Ctrl+X / Ctrl+V", "Copiar, recortar, colar ramos"],
    ],
  },
  {
    title: "Mapa",
    items: [
      ["Ctrl+Z / Ctrl+Shift+Z", "Desfazer / refazer"],
      ["Ctrl+F", "Buscar"],
      ["Ctrl+Shift+O", "Estrutura em tópicos"],
      ["Ctrl+Shift+F", "Focar no ramo"],
      ["F5", "Apresentar"],
      ["Ctrl+roda / pinça", "Zoom"],
      ["Ctrl+/", "Esta lista"],
    ],
  },
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/40 p-4 animate-in fade-in"
      role="presentation"
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Atalhos de teclado"
        onPointerDown={(event) => event.stopPropagation()}
        className="flowy-glass flowy-glass-strong max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-5"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Atalhos de teclado</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-accent"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="grid gap-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {group.title}
              </h3>
              <dl className="space-y-1.5">
                {group.items.map(([keys, label]) => (
                  <div
                    key={keys}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>
                      <kbd className="whitespace-nowrap rounded-md border bg-muted/50 px-1.5 py-0.5 text-[11px] font-semibold">
                        {keys}
                      </kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
