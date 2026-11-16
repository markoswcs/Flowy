"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

function isClientError(error: unknown) {
  const status = (error as { status?: number; code?: string } | null)?.status;
  const code = (error as { code?: string } | null)?.code ?? "";
  // PostgREST 4xx codes (PGRST1xx/PGRST2xx, 42501 permission) never fix themselves.
  return (typeof status === "number" && status >= 400 && status < 500) || /^PGRST[12]|^42501$/.test(code);
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            // A struggling server is not hit again at once: at most 2 more
            // tries, spaced out with jitter, and none for "not allowed" errors.
            retry: (failures, error) => failures < 2 && !isClientError(error),
            retryDelay: (attempt) => Math.min(15_000, 1_500 * 2 ** attempt) + Math.random() * 1_000,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
