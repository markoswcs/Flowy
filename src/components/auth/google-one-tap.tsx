"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// Google's "Continuar como …" card: one tap signs in (or creates the account)
// without leaving the page. Shown only when a Google client ID is configured.
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: Record<string, unknown>) => void;
      prompt: () => void;
      cancel: () => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function GoogleOneTap({ next = "/app" }: { next?: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const started = useRef(false);

  const start = useCallback(async () => {
    const google = window.google;
    if (!clientId || !google || started.current) return;
    started.current = true;

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      router.replace(next);
      return;
    }

    // Google receives the hashed nonce; Supabase checks it against the raw one.
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const hashedNonce = await sha256(nonce);

    google.accounts.id.initialize({
      client_id: clientId,
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
      cancel_on_tap_outside: false,
      context: "signin",
      itp_support: true,
      callback: async ({ credential }: GoogleCredentialResponse) => {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: credential,
          nonce,
        });
        if (error) {
          router.replace("/login?erro=google");
          return;
        }
        router.replace(next);
        router.refresh();
      },
    });
    google.accounts.id.prompt();
  }, [next, router]);

  useEffect(() => {
    if (loaded) void start();
    return () => window.google?.accounts.id.cancel();
  }, [loaded, start]);

  if (!clientId) return null;
  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onReady={() => setLoaded(true)}
    />
  );
}
