"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech-to-text through the browser's own Web Speech API (pt-BR). No audio is
 * recorded or stored by Flowy: the browser transcribes and hands back text.
 * Listening stops on silence, on `stop()` or after a minute at most.
 *
 * Microphone access is asked for explicitly first: while the permission is
 * still undecided the hook waits in "asking" until the person taps Permitir,
 * which opens the system prompt. A permission blocked earlier cannot be
 * re-asked by a page, so "blocked" tells the interface to explain how to
 * unblock it in the settings.
 */

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => Recognition;

export type VoiceStatus = "idle" | "asking" | "listening" | "blocked" | "error";

const ERRORS: Record<string, string> = {
  "service-not-allowed":
    "O reconhecimento de voz está bloqueado neste navegador.",
  "audio-capture": "Nenhum microfone encontrado.",
  "no-speech": "Não ouvi nada. Tente falar de novo.",
  network: "Sem conexão para transcrever a voz.",
  "language-not-supported":
    "Português não é suportado pelo reconhecimento deste navegador.",
};

const MAX_LISTEN_MS = 60_000;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isVoiceInputSupported() {
  return recognitionConstructor() !== null;
}

/** "unknown" when the browser cannot tell; recognition then asks by itself. */
async function microphonePermission(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions?.query({
      name: "microphone" as PermissionName,
    });
    return status?.state ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function useVoiceInput({
  onFinal,
}: {
  onFinal: (text: string) => void;
}) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const finalText = useRef("");
  const cancelled = useRef(false);
  const timer = useRef<number | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const fail = (message: string) => {
    setStatus("error");
    setError(message);
  };

  const listen = useCallback(() => {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    recognition.current?.abort();
    const instance = new Constructor();
    instance.lang = "pt-BR";
    instance.continuous = true;
    instance.interimResults = true;
    instance.maxAlternatives = 1;
    finalText.current = "";
    cancelled.current = false;
    setTranscript("");
    setError(null);

    instance.onresult = (event) => {
      let interim = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index]!;
        if (result.isFinal) finalText.current += `${result[0].transcript} `;
        else interim += result[0].transcript;
      }
      setTranscript(`${finalText.current}${interim}`.trim());
    };
    instance.onerror = (event) => {
      if (event.error === "aborted") return;
      cancelled.current = true;
      if (event.error === "not-allowed") {
        setStatus("blocked");
        setError(null);
        return;
      }
      fail(ERRORS[event.error] ?? "Não foi possível usar o microfone agora.");
    };
    instance.onend = () => {
      clearTimer();
      recognition.current = null;
      if (cancelled.current) return;
      const text = finalText.current.trim();
      setStatus("idle");
      if (text) onFinalRef.current(text);
    };

    try {
      instance.start();
      recognition.current = instance;
      setStatus("listening");
      timer.current = window.setTimeout(() => instance.stop(), MAX_LISTEN_MS);
    } catch {
      fail("Não foi possível iniciar o microfone.");
    }
  }, []);

  /** Opens the voice sheet: asks for the microphone first when needed. */
  const start = useCallback(async () => {
    if (!recognitionConstructor()) {
      fail(
        "Seu navegador não oferece reconhecimento de voz. Experimente o Chrome ou o Edge.",
      );
      return;
    }
    setError(null);
    const permission = await microphonePermission();
    if (permission === "denied") return setStatus("blocked");
    if (permission === "prompt") return setStatus("asking");
    listen();
  }, [listen]);

  /** Shows the system microphone prompt, then starts listening once allowed. */
  const allow = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return listen();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Only the permission was needed; recognition opens its own stream.
      stream.getTracks().forEach((track) => track.stop());
      listen();
    } catch (reason) {
      const name = reason instanceof DOMException ? reason.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("blocked");
      } else if (name === "NotFoundError") {
        fail("Nenhum microfone encontrado.");
      } else {
        fail("Não foi possível usar o microfone agora.");
      }
    }
  }, [listen]);

  /** Ends listening and delivers what was heard. */
  const stop = useCallback(() => recognition.current?.stop(), []);

  /** Ends listening and throws away what was heard. */
  const cancel = useCallback(() => {
    cancelled.current = true;
    clearTimer();
    recognition.current?.abort();
    recognition.current = null;
    setStatus("idle");
    setTranscript("");
    setError(null);
  }, []);

  useEffect(
    () => () => {
      cancelled.current = true;
      recognition.current?.abort();
    },
    [],
  );

  return { status, transcript, error, start, allow, stop, cancel };
}
