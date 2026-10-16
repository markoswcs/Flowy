import { describe, expect, it } from "vitest";

import { suggestOrganization } from "@/features/tasks/smart-organize";

const folders = [
  { id: "f-work", name: "Trabalho" },
  { id: "f-home", name: "Pessoal" },
];
const categories = [
  { id: "c-urgent", name: "Urgente" },
  { id: "c-client", name: "Clientes" },
];

describe("suggestOrganization", () => {
  it("reads explicit #label and /folder markers and strips them", () => {
    const result = suggestOrganization("Ligar pro João #urgente /pessoal", { folders, categories });
    expect(result.title).toBe("Ligar pro João");
    expect(result.folderId).toBe("f-home");
    expect(result.explicitFolder).toBe(true);
    expect(result.categoryIds).toContain("c-urgent");
  });

  it("keeps unknown markers in the title", () => {
    const result = suggestOrganization("Ver #semnome agora", { folders, categories });
    expect(result.title).toBe("Ver #semnome agora");
  });

  it("infers a folder from the built-in vocabulary", () => {
    const result = suggestOrganization("Enviar proposta para o cliente", { folders, categories });
    expect(result.folderId).toBe("f-work");
    expect(result.explicitFolder).toBe(false);
  });

  it("infers labels by name and vocabulary, accent-insensitive", () => {
    const result = suggestOrganization("Responder clientes URGENTE", { folders, categories });
    expect(result.categoryIds).toEqual(expect.arrayContaining(["c-urgent", "c-client"]));
  });

  it("learns from how similar tasks were organized", () => {
    const result = suggestOrganization("Banner da black friday", {
      folders: [{ id: "f-jara", name: "Jara Joias" }],
      categories,
      history: [
        { title: "Banner esquenta black", folder_id: "f-jara", categories: [] },
        { title: "Stories black friday", folder_id: "f-jara", categories: [] },
      ],
    });
    expect(result.folderId).toBe("f-jara");
  });

  it("suggests nothing for unrelated text", () => {
    const result = suggestOrganization("Xyz abc", { folders, categories });
    expect(result.folderId).toBeNull();
    expect(result.categoryIds).toEqual([]);
  });
});
