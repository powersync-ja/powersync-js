import { NavigationPanelContextProvider } from '@/components/navigation/NavigationPanelContext';
import { AppSchema } from '@/library/powersync/AppSchema';
import { DemoConnector } from '@/library/powersync/DemoConnector';
import { useAuthToken } from '@convex-dev/auth/react';
import { CircularProgress } from '@mui/material';
import { PowerSyncContext } from '@powersync/react';
import { PowerSyncDatabase } from '@powersync/web';
import { useConvex } from 'convex/react';
import Logger from 'js-logger';
import React, { Suspense } from 'react';

// Linting thinks this is a hook due to it's name
Logger.useDefaults(); // eslint-disable-line
Logger.setLevel(Logger.DEBUG);

export const powerSync = new PowerSyncDatabase({
  database: {
    dbFilename: 'example-v2.db'
  },
  schema: AppSchema,
  logger: Logger
});

// For console testing purposes
(window as any)._powersync = powerSync;

const ConnectorContext = React.createContext<DemoConnector | null>(null);
export const useConnector = () => React.useContext(ConnectorContext);

const AuthAwareSystemProvider = ({ children }: { children: React.ReactNode }) => {
  const authToken = useAuthToken();
  const convexClient = useConvex();
  const [connector] = React.useState(() => new DemoConnector({ convexClient }));

  // Update connector with current auth token
  React.useEffect(() => {
    if (authToken) {
      console.log('[Convex] JWT token:', authToken);
    }
    connector.setAuthToken(authToken);
  }, [authToken, connector]);

  React.useEffect(() => {
    if (authToken) {
      // Connect PowerSync when authenticated
      powerSync.connect(connector);
    } else {
      // Disconnect PowerSync when not authenticated
      powerSync.disconnect();
    }
  }, [authToken, connector]);

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
