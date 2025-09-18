import React from 'react';
import { useStatus } from '@powersync/react';
import { CheckCircleIcon, ArrowPathIcon, BoltIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

export function SyncStatusBadge({ className = '' }: { className?: string }) {
  const status = useStatus();
  const syncing = !!(status.dataFlowStatus?.downloading || status.dataFlowStatus?.uploading);

  let label = 'Offline';
  let Icon: React.ComponentType<any> = SignalSlashIcon;
  let color = 'text-gray-600 dark:text-gray-300';

  if (status.connecting) {
    label = 'Connecting…';
    Icon = ArrowPathIcon;
    color = 'text-blue-600';
  } else if (status.connected && syncing) {
    label = 'Syncing…';
    Icon = BoltIcon;
    color = 'text-blue-600';
  } else if (status.connected) {
    label = 'Synced';
    Icon = CheckCircleIcon;
    color = 'text-emerald-600';
  }

  return (
    <span className={`badge inline-flex items-center gap-1 ${className}`}>
      <Icon className={`h-4 w-4 ${color}`} /> {label}
    </span>
  );
}

export default SyncStatusBadge;
