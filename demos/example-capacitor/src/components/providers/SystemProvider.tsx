import { Capacitor } from '@capacitor/core';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase, WASQLiteOpenFactory, WASQLiteVFS } from '@powersync/web';
import React, { Suspense } from 'react';
import { AppSchema } from '../../library/powersync/AppSchema.js';
import { BackendConnector } from '../../library/powersync/BackendConnector.js';
import { LOGGER } from './Logging.js';

const platform = Capacitor.getPlatform();

LOGGER.debug('Initing PowerSync globally ');
const powerSync = new PowerSyncDatabase({
  database: new WASQLiteOpenFactory({
    dbFilename: 'ps.db',
    vfs: platform == 'ios' ? WASQLiteVFS.AccessHandlePoolVFS : WASQLiteVFS.OPFSCoopSyncVFS,
    debugMode: true
  }),
  schema: AppSchema,
  flags: {
    enableMultiTabs: false
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
