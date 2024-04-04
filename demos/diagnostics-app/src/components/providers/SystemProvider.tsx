import { NavigationPanelContextProvider } from '@/components/navigation/NavigationPanelContext';
import { AppSchema } from '@/library/powersync/AppSchema';
import { TokenConnector } from '@/library/powersync/TokenConnector';
import { PowerSyncContext } from '@journeyapps/powersync-react';
import { WASQLitePowerSyncDatabaseOpenFactory } from '@journeyapps/powersync-sdk-web';
import { CircularProgress } from '@mui/material';
import Logger from 'js-logger';
import React, { Suspense } from 'react';

Logger.useDefaults();
Logger.setLevel(Logger.DEBUG);

export const db = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'example.db',
  schema: AppSchema
}).getInstance();
export const connector = new TokenConnector();

if (connector.hasCredentials()) {
  db.connect(connector);
  connector.loadCheckpoint();
}

(window as any).db = db;

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={db}>
        <NavigationPanelContextProvider>{children}</NavigationPanelContextProvider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
