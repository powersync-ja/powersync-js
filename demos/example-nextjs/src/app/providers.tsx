'use client';

import { PowerSyncProvider } from '@/lib/powersync/powersync-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return <PowerSyncProvider>{children}</PowerSyncProvider>;
}
