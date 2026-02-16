import { NavigationPanelContextProvider } from '@/components/navigation/NavigationPanelContext';
import { db, tryConnectIfCredentials } from '@/library/powersync/ConnectionManager';
import { PowerSyncContext } from '@powersync/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Spinner } from '@/components/ui/spinner';
import React, { createContext, Suspense, useContext, useEffect, useState } from 'react';
import { localStateDb } from '@/library/powersync/LocalStateManager';
import { queryClient } from '@/lib/queryClient';
import { MonacoThemeProvider } from '@/components/providers/MonacoThemeProvider';

export const InitErrorContext = createContext<string | null>(null);

export const useInitError = () => useContext(InitErrorContext);

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
        const fullMessage =
          error instanceof Error
            ? [error.message, error.cause ? String(error.cause) : null].filter(Boolean).join('\n')
            : String(error);
        setInitError(fullMessage);
        setIsLocalDbInitialized(true); // Non-blocking: allow app to load despite init error
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
          <InitErrorContext.Provider value={initError}>
            <MonacoThemeProvider />
            <NavigationPanelContextProvider>{children}</NavigationPanelContextProvider>
          </InitErrorContext.Provider>
        </PowerSyncContext.Provider>
      </Suspense>
    </QueryClientProvider>
  );
};

export default SystemProvider;
