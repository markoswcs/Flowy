/**
 * Fixed-window counter kept in the memory of each server instance. It does not
 * replace the provider's firewall, but it stops one address from flooding an
 * instance with requests (a script, a loop, a refresh storm).
 */
const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;
const hits = new Map<string, { count: number; start: number }>();

export function rateLimit(key: string, limit: number, now = Date.now()): boolean {
  const entry = hits.get(key);
  if (!entry || now - entry.start >= WINDOW_MS) {
    if (hits.size >= MAX_KEYS) {
      for (const [old, value] of hits) if (now - value.start >= WINDOW_MS) hits.delete(old);
      if (hits.size >= MAX_KEYS) hits.clear();
    }
    hits.set(key, { count: 1, start: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

/** For tests. */
export function resetRateLimit() {
  hits.clear();
}
