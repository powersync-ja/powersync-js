'use client';

import { AppSchema } from '@/library/powersync/AppSchema';
import { BackendConnector } from '@/library/powersync/BackendConnector';
import { PowerSyncContext } from '@journeyapps/powersync-react';
import { SyncStreamConnectionMethod, WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';
import { CircularProgress } from '@mui/material';
import Logger from 'js-logger';
import React, { Suspense } from 'react';

// eslint-disable-next-line react-hooks/rules-of-hooks
Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

const powerSync = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'powersync2.db',
  schema: AppSchema,
  flags: {
    disableSSRWarning: true,
    // Makes debugging easier for connection
    // TODO enable again before merge
    enableMultiTabs: false
  },
  streamOptions: {
    connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET
  }
}).getInstance();
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
