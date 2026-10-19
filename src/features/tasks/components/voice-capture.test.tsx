import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VoiceTaskButton } from "@/features/tasks/components/voice-capture";

class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() {
    FakeRecognition.last = this;
  }
  say(text: string, isFinal: boolean) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal, 0: { transcript: text } }],
    });
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  FakeRecognition.last = null;
});

describe("VoiceTaskButton", () => {
  it("transcribes in pt-BR and hands the text over when finished", () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    const onResult = vi.fn();
    render(<VoiceTaskButton onResult={onResult} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Ditar tarefa por voz" }),
    );
    const recognition = FakeRecognition.last!;
    expect(recognition.lang).toBe("pt-BR");
    expect(recognition.start).toHaveBeenCalled();
    expect(screen.getByText("Ouvindo…")).toBeInTheDocument();

    act(() => recognition.say("revisar materiais sexta às 10h", false));
    expect(
      screen.getByText("revisar materiais sexta às 10h"),
    ).toBeInTheDocument();
    expect(onResult).not.toHaveBeenCalled();

    act(() => recognition.say("revisar materiais sexta às 10h", true));
    fireEvent.click(screen.getByRole("button", { name: "Concluir" }));
    expect(onResult).toHaveBeenCalledWith("revisar materiais sexta às 10h");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("discards what was heard on cancel", () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    const onResult = vi.fn();
    render(<VoiceTaskButton onResult={onResult} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ditar tarefa por voz" }),
    );
    act(() => FakeRecognition.last!.say("algo", true));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(FakeRecognition.last!.abort).toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains a denied microphone permission", () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    render(<VoiceTaskButton onResult={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ditar tarefa por voz" }),
    );
    act(() => FakeRecognition.last!.onerror?.({ error: "not-allowed" }));
    expect(
      screen.getByText(/Permissão do microfone negada/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tentar de novo/ }),
    ).toBeInTheDocument();
  });

  it("tells when the browser has no speech recognition", () => {
    render(<VoiceTaskButton onResult={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Ditar tarefa por voz" }),
    );
    expect(
      screen.getByText(/não oferece reconhecimento de voz/),
    ).toBeInTheDocument();
  });
});
