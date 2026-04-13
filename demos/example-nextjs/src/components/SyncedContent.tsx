'use client';

import { CustomerList } from '@/components/CustomerList';
import { StatusPanel } from '@/components/StatusPanel';
import { useStatus } from '@powersync/react';

export function SyncedContent() {
  const status = useStatus();

  if (!status.hasSynced) {
    return (
      <div className="flex flex-col items-center gap-2 py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-2 text-sm text-text-muted">Connecting…</p>
      </div>
    );
  }

  return (
    <>
      <StatusPanel />
      <CustomerList />
    </>
  );
}
