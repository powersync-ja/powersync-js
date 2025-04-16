import { PowerSyncContext } from '@powersync/react';
import { createBaseLogger, LogLevels, PowerSyncDatabase } from '@powersync/web';
import { CircularProgress } from '@mui/material';
import React, { Suspense } from 'react';
import { AppSchema } from '../../library/powersync/AppSchema.js';
import { BackendConnector } from '../../library/powersync/BackendConnector.js';
import { Capacitor } from '@capacitor/core';

const defaultLogger = createBaseLogger();
defaultLogger.useDefaults();
defaultLogger.setLevel(LogLevels.DEBUG);

const platform = Capacitor.getPlatform();
const isIOs = platform === 'ios';
// Web worker implementation does not work on iOS
const useWebWorker = !isIOs;

const powerSync = new PowerSyncDatabase({
  database: { dbFilename: 'powersync2.db' },
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
