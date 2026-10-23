"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * "Seen it / not now" for first-use invites, kept on the account (auth user
 * metadata, like the onboarding tour's `onboarded_at`) so a dismissal holds on
 * every device. localStorage is a fast local copy, read before the account.
 */
const LOCAL_PREFIX = "flowy:intro-dismissed:";
const METADATA_KEY = "dismissed_intros";

function readLocal(key: string) {
  try {
    return window.localStorage.getItem(LOCAL_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function writeLocal(key: string) {
  try {
    window.localStorage.setItem(LOCAL_PREFIX + key, "1");
  } catch {
    // Private mode: the account flag still applies.
  }
}

function dismissedOnAccount(metadata: Record<string, unknown> | undefined) {
  const list = metadata?.[METADATA_KEY];
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
}

/** Records the dismissal locally at once and on the account in the background. */
export async function dismissIntro(key: string) {
  writeLocal(key);
  try {
    const client = createClient();
    const { data } = await client.auth.getUser();
    const current = dismissedOnAccount(data.user?.user_metadata);
    if (current.includes(key)) return;
    await client.auth.updateUser({ data: { [METADATA_KEY]: [...current, key] } });
  } catch {
    // Offline: the local copy keeps it hidden here; the next dismissal syncs.
  }
}

/**
 * Whether an invite may be offered — `null` while still checking (show
 * nothing yet, so it never flashes), then `true` / `false` — and a function
 * that dismisses it for good.
 */
export function useIntroOffered(key: string, legacyLocalKeys: string[] = []) {
  const [offered, setOffered] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const legacy = legacyLocalKeys.some((legacyKey) => {
      try {
        return window.localStorage.getItem(legacyKey) === "1";
      } catch {
        return false;
      }
    });
    if (readLocal(key) || legacy) {
      // Dismissed before this was kept on the account: carry it over.
      if (!readLocal(key)) void dismissIntro(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOffered(false);
      return;
    }
    void (async () => {
      try {
        const { data } = await createClient().auth.getUser();
        const dismissed = dismissedOnAccount(data.user?.user_metadata).includes(key);
        if (dismissed) writeLocal(key);
        if (active) setOffered(!dismissed);
      } catch {
        if (active) setOffered(true);
      }
    })();
    return () => {
      active = false;
    };
    // The legacy keys are constants of each caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function dismiss() {
    setOffered(false);
    void dismissIntro(key);
  }

  return [offered, dismiss] as const;
}
