"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speech-to-text through the browser's own Web Speech API (pt-BR). No audio is
 * recorded or stored by Flowy: the browser asks for microphone permission,
 * transcribes and hands back text. Listening stops on silence, on `stop()` or
 * after a minute at most.
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

export type VoiceStatus = "idle" | "listening" | "error";

const ERRORS: Record<string, string> = {
  "not-allowed":
    "Permissão do microfone negada. Libere o acesso nas configurações do navegador.",
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

  const start = useCallback(() => {
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      setStatus("error");
      setError(
        "Seu navegador não oferece reconhecimento de voz. Experimente o Chrome ou o Edge.",
      );
      return;
    }
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
      setStatus("error");
      setError(
        ERRORS[event.error] ?? "Não foi possível usar o microfone agora.",
      );
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
      setStatus("error");
      setError("Não foi possível iniciar o microfone.");
    }
  }, []);

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

  return { status, transcript, error, start, stop, cancel };
}
