import React from 'react';
import { PowerSyncContext } from '@powersync/react';
import { SyncStreamConnectionMethod } from '@powersync/web';

import { db } from '@/library/powersync/db';
import { isBackendConfigured } from '@/library/powersync/connection';
import { seedPixelsIfNeeded } from '@/library/powersync/seed';
import { SupabaseConnector } from '@/library/powersync/SupabaseConnector';
import { selectConnectionMethod } from '@/library/powersync/vfs';

const SupabaseContext = React.createContext<SupabaseConnector | null>(null);
export const useSupabase = () => React.useContext(SupabaseContext);

export { db };

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const [powerSync] = React.useState(db);
  const [connector] = React.useState(() => (isBackendConfigured() ? new SupabaseConnector() : null));
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      // For console testing/debugging.
      (window as any)._powersync = powerSync;

      await powerSync.init();

      if (connector) {
        const l = connector.registerListener({
          sessionStarted: () => {
            powerSync.connect(connector, {
              connectionMethod: selectConnectionMethod()
            });
          }
        });
        cleanup = () => l?.();
        await connector.init();
      } else {
        // Standalone mode: seed a blank canvas locally so the app is usable
        // without any backend.
        await seedPixelsIfNeeded(powerSync);
      }

      setReady(true);
    })();

    return () => cleanup?.();
  }, [powerSync, connector]);

  if (!ready) {
    return <div className="app-loading">Loading canvas…</div>;
  }

  return (
    <PowerSyncContext.Provider value={powerSync}>
      <SupabaseContext.Provider value={connector}>{children}</SupabaseContext.Provider>
    </PowerSyncContext.Provider>
  );
};

export default SystemProvider;
