import { useLayoutEffect, useRef, useState } from "react";

type Loose = (...args: unknown[]) => unknown;

/**
 * Returns an object with the same keys whose functions never change identity
 * but always call the latest implementation. Lets memoized children (500+
 * topics) receive callbacks without re-rendering on every map edit.
 */
export function useStableHandlers<
  T extends { [K in keyof T]: (...args: never[]) => unknown },
>(handlers: T): T {
  const latest = useRef(handlers);
  useLayoutEffect(() => {
    latest.current = handlers;
  });
  const [stable] = useState(() => {
    const result: Record<string, Loose> = {};
    for (const key of Object.keys(handlers)) {
      result[key] = (...args: unknown[]) =>
        (latest.current[key as keyof T] as unknown as Loose | undefined)?.(
          ...args,
        );
    }
    return result as unknown as T;
  });
  return stable;
}
