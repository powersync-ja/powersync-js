import { PowerSyncContext } from '@powersync/react';
import { createConsoleLogger, LogLevels, PowerSyncDatabase } from '@powersync/web';
import { CircularProgress } from '@mui/material';
import React, { Suspense } from 'react';
import { AppSchema } from '../../library/powersync/AppSchema.js';
import { BackendConnector } from '../../library/powersync/BackendConnector.js';

const powerSync = new PowerSyncDatabase({
  database: { dbFilename: 'powersync2.db' },
  schema: AppSchema,
  flags: {
    disableSSRWarning: true
  },
  logger: createConsoleLogger({ minLevel: LogLevels.debug })
});

const powerSyncEndpoint = import.meta.env.VITE_POWERSYNC_URL;
const powerSyncToken = import.meta.env.VITE_PUBLIC_POWERSYNC_TOKEN;
if (powerSyncEndpoint && powerSyncToken) {
  const connector = new BackendConnector(powerSyncToken);
  powerSync.connect({
    powerSyncEndpoint,
    authenticator: connector,
    upload: connector.upload
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
