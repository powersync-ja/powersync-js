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

  // Serialize to a string so the effect dep is a stable primitive.
  // Parsed back inside the effect so the closure always uses the exact snapshot for this run.
  const serialized = useMemo(() => JSON.stringify(streams), [streams]);

  useEffect(() => {
    const currentStreams: UseSyncStreamOptions[] = JSON.parse(serialized);

    // `cleanedUp` is set synchronously when the cleanup function runs.
    // The async loop checks it after each await so any handle that resolves
    // after cleanup is unsubscribed immediately rather than being orphaned.
    let cleanedUp = false;
    const resolvedSubs: { unsubscribe(): void }[] = [];

    (async () => {
      for (const options of currentStreams) {
        if (cleanedUp) break;
        const sub = await db.syncStream(options.name, options.parameters ?? undefined).subscribe(options);
        if (cleanedUp) {
          // Cleanup already ran while this subscribe was in flight — drop it immediately.
          sub.unsubscribe();
          break;
        }
        resolvedSubs.push(sub);
      }
    })();

    return () => {
      cleanedUp = true;
      for (const sub of resolvedSubs) {
        sub.unsubscribe();
      }
    };
  }, [serialized]);

  return useMemo(
    () =>
      streams.map((options) =>
        status.forStream({ name: options.name, parameters: options.parameters ?? null }) ?? null
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, serialized]
  );
}
