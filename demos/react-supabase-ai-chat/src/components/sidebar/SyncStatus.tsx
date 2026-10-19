import { useSupabase } from '@/components/providers/SystemProvider';
import { cn } from '@/library/cn';
import { usePowerSync, useStatus } from '@powersync/react';

/**
 * Shows the PowerSync connection state, with a toggle to go offline. Messages sent while offline are kept locally and
 * answered after reconnecting.
 */
export function SyncStatus() {
  const powerSync = usePowerSync();
  const connector = useSupabase();
  const status = useStatus();

  const [label, color] = status.connected
    ? status.uploading || status.downloading
      ? ['Syncing', 'bg-brand']
      : ['Synced', 'bg-emerald-500']
    : status.connecting
      ? ['Connecting', 'bg-amber-500']
      : ['Offline', 'bg-stone-400'];

  const online = status.connected || status.connecting;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-3.5 text-sm">
      <span className="flex items-center gap-2">
        <span className={cn('size-2 rounded-full', color)} />
        {label}
      </span>
      <button
        type="button"
        onClick={() => (online ? powerSync.disconnect() : connector && powerSync.connect(connector))}
        className="rounded-md px-2 py-1 text-xs text-muted hover:bg-hover hover:text-ink"
      >
        {online ? 'Go offline' : 'Go online'}
      </button>
    </div>
  );
}
