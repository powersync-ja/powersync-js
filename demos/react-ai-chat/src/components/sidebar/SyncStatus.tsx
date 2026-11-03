import { connector } from '@/components/providers/SystemProvider';
import { cn } from '@/library/cn';
import { usePowerSync, useStatus } from '@powersync/react';

/**
 * Shows the PowerSync connection state, with a toggle to go offline. Messages sent while offline are kept locally and
 * answered after reconnecting.
 */
export function SyncStatus() {
  const powerSync = usePowerSync();
  const status = useStatus();

  const [label, color] = status.connected
    ? status.uploading || status.downloading
      ? ['Syncing', 'bg-brand ring-brand/15']
      : ['Synced', 'bg-emerald-500 ring-emerald-500/15']
    : status.connecting
      ? ['Connecting', 'bg-amber-500 ring-amber-500/15']
      : ['Offline', 'bg-muted ring-muted/15'];

  const online = status.connected || status.connecting;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3.5 text-sm">
      <span className="flex items-center gap-2.5">
        <span className={cn('size-2 rounded-full ring-4', color)} />
        {label}
      </span>
      <button
        type="button"
        onClick={() => (online ? powerSync.disconnect() : powerSync.connect(connector))}
        className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        {online ? 'Go offline' : 'Go online'}
      </button>
    </div>
  );
}
