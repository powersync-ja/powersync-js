'use client';

import { CustomerList } from '@/components/CustomerList';
import { StatusPanel } from '@/components/StatusPanel';
import { useStatus } from '@powersync/react';
import Image from 'next/image';

export default function HomePage() {
  const status = useStatus();

  if (!status.hasSynced) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <Image src="/powersync-logo.svg" alt="PowerSync" width={220} height={34} priority />
        <div className="mt-4 size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-2 text-sm text-text-muted">Connecting…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-8 flex justify-center">
          <Image src="/powersync-logo.svg" alt="PowerSync" width={200} height={31} priority />
        </div>
        <StatusPanel />
        <CustomerList />
      </div>
    </div>
  );
}
