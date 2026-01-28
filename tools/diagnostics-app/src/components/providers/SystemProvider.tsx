import { NavigationPanelContextProvider } from '@/components/navigation/NavigationPanelContext';
import { db } from '@/library/powersync/ConnectionManager';
import { PowerSyncContext } from '@powersync/react';
import { Spinner } from '@/components/ui/spinner';
import React, { Suspense } from 'react';

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Spinner size="lg" />
        </div>
      }>
      <PowerSyncContext.Provider value={db}>
        <NavigationPanelContextProvider>{children}</NavigationPanelContextProvider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
