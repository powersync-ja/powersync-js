import { NavigationPanelContextProvider } from '@/components/navigation/NavigationPanelContext';
import { db, tryConnectIfCredentials } from '@/library/powersync/ConnectionManager';
import { PowerSyncContext } from '@powersync/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import React, { Suspense, useEffect, useState } from 'react';
import { localStateDb } from '@/library/powersync/LocalStateManager';
import { queryClient } from '@/lib/queryClient';

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLocalDbInitialized, setIsLocalDbInitialized] = useState(false);

  useEffect(() => {
    const initializeLocalStateDb = async () => {
      try {
        await localStateDb.init();
        setIsLocalDbInitialized(true);
        await tryConnectIfCredentials();
      } catch (error) {
        console.error('Failed to initialize local state database:', error);
        setIsLocalDbInitialized(true);
      }
    };
    initializeLocalStateDb();
  }, []);

  if (!isLocalDbInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
};

export default SystemProvider;
