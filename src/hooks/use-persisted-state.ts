import { useCallback, useEffect, useState } from "react";

// SSR-safe localStorage state.
export function usePersistedState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setState(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [key]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setState((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore quota errors */
        }
        return next;
      });
    },
    [key],
  );

  // Marker to avoid unused-variable warnings.
  void hydrated;
  return [state, set];
}
