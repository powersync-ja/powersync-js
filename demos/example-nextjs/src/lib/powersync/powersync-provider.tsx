'use client';

import { AppSchema } from '@/lib/powersync/schema';
import { BackendConnector } from '@/lib/powersync/connector';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';
import React, { Suspense, useRef } from 'react';

let dbInstance: PowerSyncDatabase | null = null;

function getDB(): PowerSyncDatabase {
  if (!dbInstance) {
    const factory = new WASQLiteOpenFactory({
      dbFilename: 'powersync-nextjs.db',
      worker: '/@powersync/worker/WASQLiteDB.umd.js'
    });

    dbInstance = new PowerSyncDatabase({
      database: factory,
      schema: AppSchema,
      flags: { disableSSRWarning: true },
      sync: { worker: '/@powersync/worker/SharedSyncImplementation.umd.js' }
    });

    dbInstance.connect(new BackendConnector());
  }

  return dbInstance;
}

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const db = useRef(getDB());

  return (
    <Suspense>
      <PowerSyncContext.Provider value={db.current}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
}
