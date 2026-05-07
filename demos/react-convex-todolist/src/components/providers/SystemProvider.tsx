import { NavigationPanelContextProvider } from '@/components/navigation/NavigationPanelContext';
import { AppSchema } from '@/library/powersync/AppSchema';
import { DemoConnector } from '@/library/powersync/DemoConnector';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/web';
import Logger from 'js-logger';
import React, { Suspense } from 'react';
import { useAuthToken } from '@convex-dev/auth/react';
import { useConvex } from 'convex/react';

export const db = new PowerSyncDatabase({
  database: {
    dbFilename: 'example-v2.db'
  },
  schema: AppSchema,
  logger: Logger
});

// Make db accessible on the console for debugging
(window as any).db = db;

const ConnectorContext = React.createContext<DemoConnector | null>(null);
export const useConnector = () => React.useContext(ConnectorContext);

const AuthAwareSystemProvider = ({ children }: { children: React.ReactNode }) => {
  const authToken = useAuthToken();
  const convexClient = useConvex();
  const [connector] = React.useState(new DemoConnector());
  const [powerSync] = React.useState(db);

  // Provide the Convex client to the connector for direct mutation calls
  React.useEffect(() => {
    connector.setConvexClient(convexClient);
  }, [convexClient, connector]);

  // Update connector with current auth token
  React.useEffect(() => {
    if (authToken) {
      console.log('[Convex] JWT token:', authToken);
    }
    connector.setAuthToken(authToken);
  }, [authToken, connector]);

  React.useEffect(() => {
    // Linting thinks this is a hook due to it's name
    Logger.useDefaults(); // eslint-disable-line
    Logger.setLevel(Logger.DEBUG);

    // For console testing purposes
    (window as any)._powersync = powerSync;

    powerSync.init();
  }, [powerSync]);

  React.useEffect(() => {
    if (authToken) {
      // Connect PowerSync when authenticated
      powerSync.connect(connector);
    } else {
      // Disconnect PowerSync when not authenticated
      powerSync.disconnect();
    }
  }, [authToken, powerSync, connector]);

  return (
    <Suspense fallback={<CircularProgress />}>
      <PowerSyncContext.Provider value={powerSync}>
        <ConnectorContext.Provider value={connector}>
          <NavigationPanelContextProvider>{children}</NavigationPanelContextProvider>
        </ConnectorContext.Provider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return <AuthAwareSystemProvider>{children}</AuthAwareSystemProvider>;
};

export default SystemProvider;
