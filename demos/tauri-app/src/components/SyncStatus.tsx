import { useStatus } from '@powersync/react';
import { useMemo } from 'react';

export function SyncStatus() {
  const status = useStatus();
  const renderedStatus = useMemo(() => JSON.stringify((status as any).options, null, 2), [status]);

  return (
    <div>
      {' '}
      <h2>Sync Status</h2>
      <pre>
        <code>{renderedStatus}</code>
      </pre>
    </div>
  );
}
