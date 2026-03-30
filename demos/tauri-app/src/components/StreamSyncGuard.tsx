import { SyncStreamDescription } from '@powersync/common';
import { useSyncStream } from '@powersync/react';
import { ReactNode } from 'react';

/**
 * Renders a child component if required data has synced.
 */
export function SyncStreamGuard({
  stream,
  children
}: {
  stream: SyncStreamDescription;
  children: ReactNode;
}): ReactNode {
  const streamStatus = useSyncStream(stream);

  if (streamStatus && streamStatus.subscription.hasSynced) {
    return children;
  } else {
    const progress = streamStatus?.progress;
    let description = 'Syncing data.';
    if (progress) {
      if (progress.downloadedFraction == 1) {
        description = 'Applying synced data to local database';
      } else {
        description += `Progress: ${progress.downloadedOperations} / ${progress.totalOperations}...`;
      }
    }

    return <p>{description}</p>;
  }
}
