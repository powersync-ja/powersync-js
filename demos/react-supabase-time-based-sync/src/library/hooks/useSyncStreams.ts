import { useEffect, useMemo } from 'react';
import { usePowerSync, useStatus, UseSyncStreamOptions } from '@powersync/react';

/**
 * Creates multiple PowerSync stream subscriptions. Subscriptions are kept alive as long as the
 * React component calling this function. When it unmounts, or when the streams array contents
 * change, all previous subscriptions are unsubscribed before new ones are created.
 */
export function useSyncStreams(streams: UseSyncStreamOptions[]) {
  const db = usePowerSync();
  const status = useStatus();

  // Serialize streams so the effect only re-runs when content actually changes.
  // We also parse it back so the effect closure uses the EXACT same streams that triggered it —
  // avoiding the stale-ref problem where streamsRef.current may have advanced to a newer render
  // by the time the effect flushes.
  const serialized = useMemo(() => JSON.stringify(streams), [streams]);
  const frozenStreams = useMemo<UseSyncStreamOptions[]>(() => JSON.parse(serialized), [serialized]);

  useEffect(() => {
    const abort = new AbortController();

    const promises = frozenStreams.map((options) =>
      db.syncStream(options.name, options.parameters ?? undefined).subscribe(options)
    );

    Promise.all(promises).then((resolvedSubs) => {
      if (abort.signal.aborted) {
        // Cleanup already ran before all promises resolved — unsubscribe immediately.
        for (const sub of resolvedSubs) {
          sub.unsubscribe();
        }
        return;
      }

      // Cleanup will run eventually — unsubscribe when it does.
      abort.signal.addEventListener('abort', () => {
        for (const sub of resolvedSubs) {
          sub.unsubscribe();
        }
      });
    });

    return () => abort.abort();
  }, [frozenStreams]);

  return useMemo(
    () =>
      streams.map((options) =>
        status.forStream({ name: options.name, parameters: options.parameters ?? null }) ?? null
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, serialized]
  );
}
