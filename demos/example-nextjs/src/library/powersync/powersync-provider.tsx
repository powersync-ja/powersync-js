'use client';

import { AppSchema } from '@/library/powersync/schema';
import { BackendConnector } from '@/library/powersync/connector';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';
import React, { Suspense } from 'react';

let dbInstance: PowerSyncDatabase | null = null;

function getDB(): PowerSyncDatabase {
  if (dbInstance) return dbInstance;

  dbInstance = new PowerSyncDatabase({
    database: new WASQLiteOpenFactory({
      dbFilename: 'powersync-nextjs.db',
      worker: '/@powersync/worker/WASQLiteDB.umd.js'
    }),
    schema: AppSchema,
    flags: { disableSSRWarning: true },
    sync: { worker: '/@powersync/worker/SharedSyncImplementation.umd.js' }
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
