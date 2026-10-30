import { CircularProgress } from '@mui/material';
import { PowerSyncDatabase } from '@powersync/capacitor';
import { PowerSyncContext } from '@powersync/react';
import { createConsoleLogger, LogLevels } from '@powersync/web';
import React, { Suspense } from 'react';
import { AppSchema } from '../../library/powersync/AppSchema.js';
import { BackendConnector } from '../../library/powersync/BackendConnector.js';

// Uses the Web SDK for web, and Capacitor adapters for iOS/Android.
const powerSync = new PowerSyncDatabase({
  database: {
    dbFilename: 'tests.sqlite'
  },
  schema: AppSchema,
  logger: createConsoleLogger({ minLevel: LogLevels.debug })
});
const connector = new BackendConnector();

// `diagnostics` feeds per-bucket download totals to PowerSync DevTools.
powerSync.connect(connector, { diagnostics: import.meta.env.DEV });

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
