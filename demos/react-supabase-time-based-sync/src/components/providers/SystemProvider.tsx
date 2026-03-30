import { AppSchema } from '@/library/powersync/AppSchema';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import { createBaseLogger, LogLevel, PowerSyncDatabase, SyncClientImplementation } from '@powersync/web';
import React, { Suspense } from 'react';
import { NavigationPanelContextProvider } from '../navigation/NavigationPanelContext';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'time.db'
  }
});

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = React.useState(() => new SupabaseConnector());
  const [powerSync] = React.useState(db);

  React.useEffect(() => {
    const logger = createBaseLogger();
    logger.useDefaults();
    logger.setLevel(LogLevel.DEBUG);
    // For console testing purposes
    (window as any)._powersync = powerSync;

    powerSync.init();
    const l = connector.registerListener({
      initialized: () => {},
      sessionStarted: () => {
        powerSync.connect(connector, { clientImplementation: SyncClientImplementation.RUST });
      }
    });

    connector.init();

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
