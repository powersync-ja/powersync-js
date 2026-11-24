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

const powerSyncEndpoint = import.meta.env.VITE_POWERSYNC_URL;
// With no endpoint configured, the database stays local-only.
if (powerSyncEndpoint) {
  const connector = new BackendConnector();
  powerSync.connect({
    powerSyncEndpoint,
    authenticator: connector,
    upload: connector.upload,
    // `diagnostics` feeds per-bucket download totals to PowerSync DevTools.
    diagnostics: import.meta.env.DEV
  });
}

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
