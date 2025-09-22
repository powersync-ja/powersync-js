import { CircularProgress } from '@mui/material';
import { PowerSyncDatabase } from '@powersync/capacitor';
import { PowerSyncContext } from '@powersync/react';
import { createBaseLogger, LogLevel } from '@powersync/web';
import React, { Suspense } from 'react';
import { AppSchema } from '../../library/powersync/AppSchema.js';
import { BackendConnector } from '../../library/powersync/BackendConnector.js';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

// Uses the Web SDK for web, and Capacitor adapters for iOS/Android.
const powerSync = new PowerSyncDatabase({
  database: {
    dbFilename: 'tests.sqlite'
  },
  schema: AppSchema,
  flags: {
    enableMultiTabs: typeof SharedWorker !== 'undefined'
  }
});
const connector = new BackendConnector();

powerSync.connect(connector);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
