import { NavigationPanelContextProvider } from '@/components/navigation/NavigationPanelContext';
import { db } from '@/library/powersync/ConnectionManager';
import { PowerSyncContext } from '@powersync/react';
import { CircularProgress } from '@mui/material';
import React, { Suspense } from 'react';

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={db}>
        <NavigationPanelContextProvider>{children}</NavigationPanelContextProvider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
