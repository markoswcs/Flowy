import { describe, expect, it } from "vitest";

import { getAuthErrorMessage } from "@/lib/supabase/auth-errors";

describe("getAuthErrorMessage", () => {
  it("traduz erros conhecidos sem diferenciar maiúsculas e minúsculas", () => {
    expect(getAuthErrorMessage("INVALID LOGIN CREDENTIALS")).toBe(
      "E-mail ou senha incorretos.",
    );
  });

  it("não expõe mensagens desconhecidas do provedor", () => {
    expect(getAuthErrorMessage("internal provider detail")).toBe(
      "Não foi possível concluir esta ação. Tente novamente.",
    );
  });

  it("explica quando o cadastro por e-mail está desabilitado", () => {
    expect(getAuthErrorMessage("Email signups are disabled")).toBe(
      "O cadastro por e-mail ainda não está habilitado. Ative o provedor Email no Supabase.",
    );
  });

  it("usa uma mensagem segura quando o erro não contém texto", () => {
    expect(getAuthErrorMessage()).toBe(
      "Não foi possível concluir esta ação. Tente novamente.",
    );
  });
});
