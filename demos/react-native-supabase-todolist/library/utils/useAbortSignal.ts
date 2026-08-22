import { useEffect, useMemo } from 'react';

export function useAbortSignal(): AbortSignal {
  const controller = useMemo(() => new AbortController(), []);

  useEffect(() => {
    return () => controller.abort();
  }, [controller]);

  return controller.signal;
}
