'use client';

import { AppSchema } from '@/library/powersync/schema';
import { BackendConnector } from '@/library/powersync/connector';
import { PowerSyncContext } from '@powersync/react';
import { createConsoleLogger, LogLevels, PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';
import React, { Suspense } from 'react';

let dbInstance: PowerSyncDatabase | null = null;

const logger = createConsoleLogger({ minLevel: LogLevels.debug });

function getDB(): PowerSyncDatabase {
  if (dbInstance) return dbInstance;

  dbInstance = new PowerSyncDatabase({
    factory: new WASQLiteOpenFactory({
      logger,
      open: {
        dbFilename: 'powersync-nextjs.db',
        worker: '/@powersync/worker/WASQLiteDB.umd.js',
        databaseWorkerLogLevel: LogLevels.debug,
        disableSSRWarning: true
      }
    }),
    schema: AppSchema,
    sync: { worker: '/@powersync/worker/SharedSyncImplementation.umd.js' },
    logger
  });

  dbInstance.connect(new BackendConnector());
  return dbInstance;
}

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <PowerSyncContext.Provider value={getDB()}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
}
