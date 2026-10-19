import { describe, expect, it } from "vitest";

import { interpretTask } from "@/features/tasks/smart-task";

// Thursday, 15 Oct 2026, 10:00 local time.
const now = new Date(2026, 9, 15, 10, 0);

const folders = [
  { id: "f-trabalho", name: "Trabalho" },
  { id: "f-roberto", name: "Roberto" },
  { id: "f-eduardo", name: "Eduardo Lima" },
  { id: "f-pessoal", name: "Pessoal" },
];
const categories = [
  { id: "c-comercial", name: "Comercial" },
  { id: "c-design", name: "Design" },
];

const context = { folders, categories };

describe("interpretTask", () => {
  it("structures the presentation example", () => {
    const task = interpretTask(
      "Preciso finalizar urgentemente a apresentação do cliente Roberto até amanhã às 14h, incluindo os resultados da campanha e os próximos passos.",
      context,
      now,
    );
    expect(task).toMatchObject({
      title: "Finalizar a apresentação",
      description: "Incluir os resultados da campanha e os próximos passos.",
      due_date: "2026-10-16",
      due_time: "14:00",
      priority: "high",
      folderId: "f-roberto",
      ambiguities: [],
    });
  });

  it("structures a spoken request with a details sentence", () => {
    const task = interpretTask(
      "Crie uma tarefa para revisar os materiais do cliente Eduardo sexta-feira às 10h, prioridade alta. Preciso conferir os textos e imagens antes de enviar.",
      context,
      now,
    );
    expect(task).toMatchObject({
      title: "Revisar os materiais",
      description: "Conferir os textos e imagens antes de enviar.",
      due_date: "2026-10-16",
      due_time: "10:00",
      priority: "high",
      folderId: "f-eduardo",
    });
  });

  it("keeps an unknown client in the title and flags it", () => {
    const task = interpretTask(
      "Ligar para o cliente Marcos amanhã",
      context,
      now,
    );
    expect(task.title).toBe("Ligar para o cliente Marcos");
    // No client folder; the work vocabulary may still place it in Trabalho.
    expect(task.folderId).toBe("f-trabalho");
    expect(task.unknownClient).toBe("Marcos");
    expect(task.ambiguities).toHaveLength(1);
  });

  it("leaves plain titles alone", () => {
    expect(interpretTask("Comprar café", context, now)).toMatchObject({
      title: "Comprar café",
      description: null,
      due_date: null,
      priority: "normal",
      recurrence: null,
      ambiguities: [],
    });
  });

  it("reads low priority, recurrence and named folder/label", () => {
    const task = interpretTask(
      "Regar as plantas todo dia sem pressa na pasta pessoal",
      context,
      now,
    );
    expect(task).toMatchObject({
      title: "Regar as plantas",
      recurrence: "daily",
      due_date: "2026-10-15",
      priority: "low",
      folderId: "f-pessoal",
      explicitFolder: true,
    });
    expect(
      interpretTask("Revisar layout com a etiqueta design", context, now),
    ).toMatchObject({
      title: "Revisar layout",
      categoryIds: ["c-design"],
    });
  });

  it("matches existing labels mentioned in the text", () => {
    expect(
      interpretTask("Montar proposta comercial dia 20", context, now),
    ).toMatchObject({
      due_date: "2026-10-20",
      categoryIds: expect.arrayContaining(["c-comercial"]),
    });
  });

  it("warns about an open task with the same title", () => {
    const task = interpretTask(
      "Enviar relatório amanhã",
      {
        ...context,
        history: [
          { title: "Enviar relatório", folder_id: null, status: "todo" },
        ],
      },
      now,
    );
    expect(task.ambiguities).toContain(
      "Já existe uma tarefa aberta com este título.",
    );
  });

  it("understands richer date expressions", () => {
    expect(
      interpretTask("Entregar o site até 25 de novembro", context, now),
    ).toMatchObject({
      title: "Entregar o site",
      due_date: "2026-11-25",
    });
    expect(
      interpretTask("Pagar fornecedor daqui a 3 dias", context, now).due_date,
    ).toBe("2026-10-18");
    expect(
      interpretTask("Planejar sprint na próxima semana", context, now).due_date,
    ).toBe("2026-10-19");
    expect(
      interpretTask("Reunião na próxima segunda às 9 horas", context, now),
    ).toMatchObject({
      title: "Reunião",
      due_date: "2026-10-19",
      due_time: "09:00",
    });
  });
});
