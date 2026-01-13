'use client';

import { AppSchema } from '@/library/powersync/AppSchema';
import { BackendConnector } from '@/library/powersync/BackendConnector';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import { createBaseLogger, LogLevel, PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';
import React, { Suspense } from 'react';

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

const factory = new WASQLiteOpenFactory({
  dbFilename: 'powersync-nextjs.db',
  /** Use the pre-bundled worker from public/@powersync/
   * This is required since Turbopack doesn't support dynamic imports of workers yet
   * https://github.com/vercel/turborepo/issues/3643
   */
  worker: '/@powersync/worker/WASQLiteDB.umd.js'
});

const powerSync = new PowerSyncDatabase({
  database: factory,
  schema: AppSchema,
  flags: {
    disableSSRWarning: true
  },
  sync: {
    // Use the pre-bundled sync worker from public/@powersync/
    worker: '/@powersync/worker/SharedSyncImplementation.umd.js'
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
