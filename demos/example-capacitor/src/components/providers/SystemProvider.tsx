import { Capacitor } from '@capacitor/core';
import { CircularProgress } from '@mui/material';
import { CapacitorSQLiteAdapter } from '@powersync/capacitor';
import { PowerSyncContext } from '@powersync/react';
import { createBaseLogger, LogLevel, PowerSyncDatabase } from '@powersync/web';
import React, { Suspense } from 'react';
import { AppSchema } from '../../library/powersync/AppSchema.js';
import { BackendConnector } from '../../library/powersync/BackendConnector.js';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

const platform = Capacitor.getPlatform();
const isIOs = platform === 'ios';
// Web worker implementation does not work on iOS
const useWebWorker = !isIOs;

const powerSync = new PowerSyncDatabase({
  // We should probably rather have a separate Capacitor PowerSync client
  database: new CapacitorSQLiteAdapter({
    dbFilename: 'test.sqlite'
  }),
  schema: AppSchema,
  flags: {
    enableMultiTabs: false,
    useWebWorker
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
