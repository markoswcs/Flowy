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

describe("interpretTask with dictation (no punctuation)", () => {
  it("separates the action from the reason and finds date and client", () => {
    expect(
      interpretTask(
        "crie uma tarefa para amanhã às 10 horas de revisar a proposta do cliente roberto porque ele pediu para mudar os valores e incluir o novo prazo",
        context,
        now,
      ),
    ).toMatchObject({
      title: "Revisar a proposta",
      description: "Ele pediu para mudar os valores e incluir o novo prazo.",
      due_date: "2026-10-16",
      due_time: "10:00",
      folderId: "f-roberto",
    });
  });

  it("drops filler words and moves the purpose to the description", () => {
    expect(
      interpretTask(
        "né então preciso ligar para o contador sexta-feira para conferir as notas fiscais de outubro obrigado",
        context,
        now,
      ),
    ).toMatchObject({
      title: "Ligar para o contador",
      description: "Conferir as notas fiscais de outubro.",
      due_date: "2026-10-16",
    });
  });

  it("understands dictated título and descrição", () => {
    expect(
      interpretTask(
        "título reunião de alinhamento descrição levar os números do trimestre prioridade alta",
        context,
        now,
      ),
    ).toMatchObject({
      title: "Reunião de alinhamento",
      description: "Levar os números do trimestre.",
      priority: "high",
    });
  });

  it("keeps a short reminder whole", () => {
    expect(
      interpretTask("me lembra de comprar ração para o cachorro", context, now),
    ).toMatchObject({
      title: "Comprar ração para o cachorro",
      description: null,
    });
  });

  it("splits on mas and reads meio-dia", () => {
    expect(
      interpretTask(
        "postar os stories hoje ao meio-dia mas antes pedir a aprovação da Ana",
        context,
        now,
      ),
    ).toMatchObject({
      title: "Postar os stories",
      description: "Antes pedir a aprovação da Ana.",
      due_date: "2026-10-15",
      due_time: "12:00",
    });
  });

  it("takes a date said after the details", () => {
    expect(
      interpretTask(
        "enviar o orçamento porque o cliente cobrou até sexta",
        context,
        now,
      ),
    ).toMatchObject({
      title: "Enviar o orçamento",
      description: "O cliente cobrou.",
      due_date: "2026-10-16",
    });
  });
  it("shortens a long run without detail words", () => {
    expect(
      interpretTask(
        "fazer o relatório mensal de vendas e enviar para a diretoria com os gráficos atualizados",
        context,
        now,
      ),
    ).toMatchObject({
      title: "Fazer o relatório mensal de vendas",
      description: "Enviar para a diretoria com os gráficos atualizados.",
    });
  });
});

describe("interpretTask understanding intent", () => {
  const now = new Date(2026, 9, 21, 10, 0);
  const empty = { folders: [], categories: [] };

  it("turns a rambling request into a short title, reason and period", () => {
    const task = interpretTask(
      "Ah, eu preciso mandar aquele relatório pro João amanhã de manhã, sabe, porque ele precisa conferir os resultados da campanha.",
      empty,
      now,
    );
    expect(task).toMatchObject({
      title: "Enviar relatório para João",
      description: "Ele precisa conferir os resultados da campanha. Período: manhã.",
      due_date: "2026-10-22",
      due_time: null,
      period: "manhã",
      ambiguities: [],
    });
  });

  it("drops stutters and repeated words", () => {
    const task = interpretTask("é é preciso preciso revisar o contrato o contrato da Maria hoje à noite", empty, now);
    expect(task).toMatchObject({ title: "Revisar o contrato da Maria", due_date: "2026-10-21", period: "noite" });
  });

  it("lists spoken steps as subtasks", () => {
    const task = interpretTask(
      "preciso fazer a apresentação do cliente, primeiro montar os slides, depois revisar os números e por fim enviar pro Pedro",
      empty,
      now,
    );
    expect(task.title).toBe("Fazer a apresentação do cliente");
    expect(task.subtasks).toEqual(["Montar os slides", "Revisar os números", "Enviar para Pedro"]);
    expect(task.description).toBe("• Montar os slides\n• Revisar os números\n• Enviar para Pedro");
  });

  it("asks when two different dates are mentioned", () => {
    const task = interpretTask("enviar o orçamento amanhã porque o cliente pediu até sexta", empty, now);
    expect(task.ambiguities).toContain("Mais de uma data foi mencionada.");
  });

  it("never turns a period into an hour", () => {
    expect(interpretTask("reunião com a equipe amanhã à tarde", empty, now)).toMatchObject({
      title: "Reunião com a equipe",
      due_time: null,
      period: "tarde",
    });
    expect(interpretTask("levar o carro na oficina às 3 da tarde", empty, now)).toMatchObject({
      due_time: "15:00",
      period: null,
    });
  });

  it("ignores the task being saved when checking for duplicates", () => {
    const history = [{ id: "optimistic-1", title: "Comprar pão", folder_id: null, status: "todo" }];
    expect(interpretTask("comprar pão", { ...empty, history }, now).ambiguities).toEqual([]);
    const saved = [{ id: "abc", title: "Comprar pão", folder_id: null, status: "todo" }];
    expect(interpretTask("comprar pão", { ...empty, history: saved }, now).ambiguities).toContain(
      "Já existe uma tarefa aberta com este título.",
    );
  });
});
