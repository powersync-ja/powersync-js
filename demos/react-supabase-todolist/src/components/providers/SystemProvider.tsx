import { NavigationPanelContextProvider } from '@/components/navigation/NavigationPanelContext';
import { AppSchema } from '@/library/powersync/AppSchema';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { PowerSyncContext } from '@powersync/react';
import { SyncStreamConnectionMethod, WASQLitePowerSyncDatabaseOpenFactory } from '@powersync/web';
import { CircularProgress } from '@mui/material';
import Logger from 'js-logger';
import React, { Suspense } from 'react';

import { configureFts } from '../../app/utils/fts_setup';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

export const db = new WASQLitePowerSyncDatabaseOpenFactory({
  dbFilename: 'example.db',
  schema: AppSchema,
  streamOptions: {
    connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET
  }
}).getInstance();

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = React.useState(new SupabaseConnector());
  const [powerSync] = React.useState(db);

  React.useEffect(() => {
    // Linting thinks this is a hook due to it's name
    Logger.useDefaults(); // eslint-disable-line
    Logger.setLevel(Logger.DEBUG);
    // For console testing purposes
    (window as any)._powersync = powerSync;

    powerSync.init();
    const l = connector.registerListener({
      initialized: () => {},
      sessionStarted: () => {
        powerSync.connect(connector);
      }
    });

    connector.init();

    // Demo using SQLite Full-Text Search with PowerSync.
    // See https://docs.powersync.com/usage-examples/full-text-search for more details
    configureFts();

    return () => l?.();
  }, [powerSync, connector]);

  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={powerSync}>
        <SupabaseContext.Provider value={connector}>
          <NavigationPanelContextProvider>{children}</NavigationPanelContextProvider>
        </SupabaseContext.Provider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
