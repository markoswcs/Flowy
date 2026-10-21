import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { transcriptFrom, useVoiceInput } from "@/features/tasks/use-voice-input";

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

class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: { results: unknown }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {}
  stop() {
    this.onend?.();
  }
  // Like the browser, an aborted recognizer still ends a moment later.
  abort() {}
  hear(text: string) {
    this.onresult?.({ results: [result(text)] });
  }
}

describe("useVoiceInput", () => {
  afterEach(() => {
    FakeRecognition.instances = [];
    vi.unstubAllGlobals();
  });

  it("delivers a dictation once even when listening restarts", async () => {
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    const onFinal = vi.fn();
    const { result: hook } = renderHook(() => useVoiceInput({ onFinal }));

    await act(() => hook.current.start());
    await act(() => hook.current.start());
    const [first, second] = FakeRecognition.instances;
    act(() => second!.hear("comprar pão"));
    // The replaced recognizer ends late; it must not report the new text.
    act(() => first!.onend?.());
    // The live recognizer then ends on its own (silence or "Concluir").
    act(() => second!.stop());

    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(onFinal).toHaveBeenCalledWith("comprar pão");
  });
});
