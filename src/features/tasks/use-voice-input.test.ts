import { describe, expect, it } from "vitest";

import { transcriptFrom } from "@/features/tasks/use-voice-input";

const result = (transcript: string, isFinal = true) => ({
  isFinal,
  0: { transcript },
});

describe("transcriptFrom", () => {
  it("joins separate phrases as said (desktop continuous mode)", () => {
    expect(
      transcriptFrom([result("revisar os materiais"), result("sexta às 10h")]),
    ).toEqual({
      final: "revisar os materiais sexta às 10h",
      full: "revisar os materiais sexta às 10h",
    });
  });

  it("keeps only the longest version of a growing phrase (Android)", () => {
    expect(
      transcriptFrom([
        result("revisar"),
        result("revisar os materiais"),
        result("revisar os materiais sexta às 10h"),
      ]).final,
    ).toBe("revisar os materiais sexta às 10h");
  });

  it("ignores a repeated shorter piece and case changes", () => {
    expect(
      transcriptFrom([
        result("Revisar os materiais"),
        result("revisar"),
        result("revisar os materiais do cliente"),
      ]).final,
    ).toBe("revisar os materiais do cliente");
  });

  it("does not repeat the final text in the live preview", () => {
    expect(
      transcriptFrom([
        result("revisar os materiais"),
        result("revisar os materiais sexta", false),
      ]).full,
    ).toBe("revisar os materiais sexta");
    expect(
      transcriptFrom([result("comprar pão"), result("amanhã cedo", false)])
        .full,
    ).toBe("comprar pão amanhã cedo");
  });
});
