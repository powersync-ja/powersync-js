'use client';

import { useStatus } from '@powersync/react';

const chipStyles = {
  default: 'bg-border text-text-muted',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  error: 'bg-danger/20 text-danger'
} as const;

function StatusItem({ label, value, ok, icon }: { label: string; value: string; ok: boolean; icon?: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs text-text-muted">{label}</span>
      <div className="flex items-center gap-1">
        {icon}
        <span className={`text-sm font-medium ${ok ? 'text-text' : 'text-text-muted'}`}>{value}</span>
      </div>
    </div>
  );
}

function ArrowUp() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
    </svg>
  );
}

export function StatusPanel() {
  const status = useStatus();
  const { connected, hasSynced, dataFlowStatus } = status;
  const { uploading, downloading, uploadError, downloadError } = dataFlowStatus;

  let label = 'Connecting…';
  let chipColor: keyof typeof chipStyles = 'warning';

  if (connected && hasSynced) {
    if (uploadError || downloadError) {
      label = 'Error';
      chipColor = 'error';
    } else {
      label = 'Synced';
      chipColor = 'success';
    }
  } else if (connected) {
    label = 'Syncing';
    chipColor = 'warning';
  } else if (hasSynced) {
    label = 'Disconnected';
    chipColor = 'default';
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest text-text-muted uppercase">Sync Status</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chipStyles[chipColor]}`}>{label}</span>
      </div>

      <hr className="my-3 border-border" />

      <div className="grid grid-cols-2 gap-x-2 gap-y-3 pt-2">
        <StatusItem label="Connected" value={connected ? 'Yes' : 'No'} ok={!!connected} />
        <StatusItem label="Initial sync" value={hasSynced ? 'Done' : 'Pending'} ok={!!hasSynced} />
        <StatusItem
          label="Upload"
          value={uploadError ? 'Error' : uploading ? 'Active' : 'Idle'}
          ok={!uploadError}
          icon={uploading ? <ArrowUp /> : undefined}
        />
        <StatusItem
          label="Download"
          value={downloadError ? 'Error' : downloading ? 'Active' : 'Idle'}
          ok={!downloadError}
          icon={downloading ? <ArrowDown /> : undefined}
        />
      </div>

      {(uploadError || downloadError) && (
        <div className="mt-3 space-y-1">
          {uploadError && <p className="text-xs text-danger">Upload: {String(uploadError)}</p>}
          {downloadError && <p className="text-xs text-danger">Download: {String(downloadError)}</p>}
        </div>
      )}
    </div>
  );
}
