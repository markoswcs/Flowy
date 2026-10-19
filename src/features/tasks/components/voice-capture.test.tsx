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

function setPermission(state: PermissionState, micWorks = state !== "denied") {
  vi.stubGlobal("navigator", {
    ...navigator,
    permissions: { query: vi.fn(async () => ({ state })) },
    mediaDevices: {
      getUserMedia: vi.fn(async () => {
        if (!micWorks) throw new DOMException("blocked", "NotAllowedError");
        return { getTracks: () => [{ stop: vi.fn() }] };
      }),
    },
  });
}

async function openVoice() {
  await act(async () => {
    fireEvent.click(
      screen.getByRole("button", { name: "Ditar tarefa por voz" }),
    );
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  FakeRecognition.last = null;
});

describe("VoiceTaskButton", () => {
  it("transcribes in pt-BR and hands the text over when finished", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    setPermission("granted");
    const onResult = vi.fn();
    render(<VoiceTaskButton onResult={onResult} />);

    await openVoice();
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

  it("discards what was heard on cancel", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    setPermission("granted");
    const onResult = vi.fn();
    render(<VoiceTaskButton onResult={onResult} />);
    await openVoice();
    act(() => FakeRecognition.last!.say("algo", true));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(FakeRecognition.last!.abort).toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for the microphone with a button before listening", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    setPermission("prompt");
    render(<VoiceTaskButton onResult={vi.fn()} />);
    await openVoice();
    expect(screen.getByText("Permitir o microfone")).toBeInTheDocument();
    expect(FakeRecognition.last).toBeNull();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Permitir microfone" }),
      );
    });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: true,
    });
    expect(FakeRecognition.last!.start).toHaveBeenCalled();
    expect(screen.getByText("Ouvindo…")).toBeInTheDocument();
  });

  it("explains how to unblock a denied microphone", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    setPermission("denied");
    render(<VoiceTaskButton onResult={vi.fn()} />);
    await openVoice();
    expect(screen.getByText("Microfone bloqueado")).toBeInTheDocument();
    expect(
      screen.getByText(/Microfone|Permissões/, { selector: "li" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Já liberei" }),
    ).toBeInTheDocument();
  });

  it("says so when tapping Já liberei while still blocked", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    setPermission("denied");
    render(<VoiceTaskButton onResult={vi.fn()} />);
    await openVoice();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Já liberei" }));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ainda está bloqueado",
    );
  });

  it("offers keyboard dictation when the speech service refuses with the mic allowed", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    setPermission("granted");
    render(
      <>
        <input id="task-field" aria-label="Campo" />
        <VoiceTaskButton onResult={vi.fn()} inputId="task-field" />
      </>,
    );
    await openVoice();
    await act(async () => {
      FakeRecognition.last!.onerror?.({ error: "not-allowed" });
    });
    expect(screen.getByText("Ditado indisponível aqui")).toBeInTheDocument();
    expect(
      screen.getByText(/not-allowed · microfone: granted/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar teclado" }));
    expect(screen.getByLabelText("Campo")).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tells when the browser has no speech recognition", async () => {
    render(<VoiceTaskButton onResult={vi.fn()} />);
    await openVoice();
    expect(
      screen.getByText(/não oferece reconhecimento de voz/),
    ).toBeInTheDocument();
  });
});
