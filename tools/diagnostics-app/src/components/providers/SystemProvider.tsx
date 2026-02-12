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
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeLocalStateDb = async () => {
      try {
        await localStateDb.init();
        setIsLocalDbInitialized(true);
        await tryConnectIfCredentials();
      } catch (error) {
        console.error('Failed to initialize local state database:', error);
        setInitError(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    };
    initializeLocalStateDb();
  }, []);

  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold text-destructive">Failed to initialize</h1>
          <p className="text-sm text-muted-foreground">The local state database could not be initialized.</p>
          <pre className="rounded-md bg-muted p-4 text-sm font-mono text-left whitespace-pre-wrap break-all">
            {initError}
          </pre>
        </div>
      </div>
    );
  }

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
