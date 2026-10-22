import { AppSchema } from '@/library/powersync/AppSchema';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { PowerSyncContext } from '@powersync/react';
import { createConsoleLogger, LogLevels, PowerSyncDatabase } from '@powersync/web';
import React, { Suspense } from 'react';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'ai-chat.db'
  },
  // Replies sync many small updates per second, which makes debug logging very noisy.
  logger: createConsoleLogger({ minLevel: LogLevels.info })
});

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [connector] = React.useState(() => new SupabaseConnector());
  const [powerSync] = React.useState(db);

  React.useEffect(() => {
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

    return () => l?.();
  }, [powerSync, connector]);

  return (
    <Suspense fallback={null}>
      <PowerSyncContext.Provider value={powerSync}>
        <SupabaseContext.Provider value={connector}>{children}</SupabaseContext.Provider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
