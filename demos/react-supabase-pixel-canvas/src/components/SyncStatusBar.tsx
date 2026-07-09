import React from 'react';
import { usePowerSync, useStatus } from '@powersync/react';
import { SyncStreamConnectionMethod } from '@powersync/web';

import { useSupabase } from '@/components/providers/SystemProvider';
import { usePendingUploadCount } from '@/library/powersync/hooks';
import { selectConnectionMethod } from '@/library/powersync/vfs';

export const SyncStatusBar: React.FC = () => {
  const powerSync = usePowerSync();
  const connector = useSupabase();
  const status = useStatus();
  const { data: pending } = usePendingUploadCount();
  const pendingCount = pending[0]?.count ?? 0;

  const backendConfigured = !!connector;

  const toggleConnection = async () => {
    if (!connector) {
      return;
    }
    if (status.connected) {
      await powerSync.disconnect();
    } else {
      await powerSync.connect(connector, { connectionMethod: selectConnectionMethod() });
    }
  };

  let stateLabel: string;
  let stateClass: string;
  if (!backendConfigured) {
    stateLabel = 'Offline demo';
    stateClass = 'offline';
  } else if (status.connected) {
    stateLabel = status.dataFlowStatus.uploading ? 'Syncing…' : 'Connected';
    stateClass = 'connected';
  } else {
    stateLabel = 'Disconnected';
    stateClass = 'disconnected';
  }

  return (
    <div className="sync-bar">
      <span className={`sync-bar__dot sync-bar__dot--${stateClass}`} />
      <span className="sync-bar__state">{stateLabel}</span>
      {pendingCount > 0 && (
        <span className="sync-bar__pending">
          {pendingCount} pixel{pendingCount === 1 ? '' : 's'} queued
        </span>
      )}
      <span className="sync-bar__spacer" />
      {backendConfigured ? (
        <button type="button" className="sync-bar__toggle" onClick={toggleConnection}>
          {status.connected ? 'Go offline' : 'Go online'}
        </button>
      ) : (
        <span className="sync-bar__hint" title="Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_POWERSYNC_URL">
          no backend
        </span>
      )}
    </div>
  );
};

export default SyncStatusBar;
