'use client';

import { AppSchema } from '@/library/powersync/schema';
import { BackendConnector } from '@/library/powersync/connector';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/web';
import React, { Suspense, useRef } from 'react';

const kDB = Symbol.for('powersync-demo-db');
const g = globalThis as typeof globalThis & { [kDB]?: PowerSyncDatabase };

function getDB(): PowerSyncDatabase {
  if (!g[kDB]) {
    const factory = new WASQLiteOpenFactory({
      dbFilename: 'powersync-nextjs.db',
      worker: '/@powersync/worker/WASQLiteDB.umd.js'
    });

    g[kDB] = new PowerSyncDatabase({
      database: factory,
      schema: AppSchema,
      flags: { disableSSRWarning: true },
      sync: { worker: '/@powersync/worker/SharedSyncImplementation.umd.js' }
    });

    g[kDB].connect(new BackendConnector());
  }

  return g[kDB];
}

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const db = useRef(getDB());

  return (
    <Suspense>
      <PowerSyncContext.Provider value={db.current}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
}
