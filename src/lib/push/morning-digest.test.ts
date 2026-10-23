import { describe, expect, it } from "vitest";

import { buildMorningDigest } from "./morning-digest";

describe("buildMorningDigest", () => {
  it("skips the push when there is nothing to do", () => {
    expect(buildMorningDigest({ today_count: 0, overdue_count: 0, titles: [] })).toBeNull();
  });

  it("puts today's count in the title and overdue plus titles in the body", () => {
    const payload = buildMorningDigest({
      today_count: 4,
      overdue_count: 2,
      titles: ["Pagar conta", "Ligar pro João", "Academia"],
    });

    expect(payload).toEqual({
      title: "☀️ Bom dia! 4 tarefas para hoje",
      body: "⚠️ 2 atrasadas · Pagar conta, Ligar pro João, Academia e mais 3",
      url: "/app?view=today",
      tag: "morning-digest",
    });
  });

  it("uses the singular and leaves out 'e mais' when every task is listed", () => {
    const payload = buildMorningDigest({ today_count: 1, overdue_count: 0, titles: ["Pagar conta"] });

    expect(payload?.title).toBe("☀️ Bom dia! 1 tarefa para hoje");
    expect(payload?.body).toBe("Pagar conta");
  });

  it("still reminds of overdue tasks on a day with nothing new", () => {
    const payload = buildMorningDigest({ today_count: 0, overdue_count: 1, titles: ["Relatório"] });

    expect(payload?.title).toBe("☀️ Bom dia! Hora de colocar o atrasado em dia");
    expect(payload?.body).toBe("⚠️ 1 atrasada · Relatório");
  });

  it("shortens long titles", () => {
    const payload = buildMorningDigest({
      today_count: 1,
      overdue_count: 0,
      titles: ["Revisar o contrato de prestação de serviços com o cliente novo"],
    });

    expect(payload?.body).toBe("Revisar o contrato de prestação de serv…");
    expect(payload?.body).toHaveLength(40);
  });
});
